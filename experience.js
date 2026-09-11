import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const canvas = document.querySelector("#hero-canvas");
const control = document.querySelector("#orbit-control");
const cards = [...document.querySelectorAll(".program-card")];
const message = document.querySelector("#program-message");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const revealElements = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    }),
    { threshold: 0.16 },
  );
  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("visible"));
}

cards.forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    const bounds = card.getBoundingClientRect();
    card.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    card.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
  });
});

if (!canvas || !control) {
  throw new Error("3D səhnə üçün lazım olan elementlər tapılmadı.");
}

try {
  const stage = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0.1, 7);

  const world = new THREE.Group();
  scene.add(world);

  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0x087ec4,
    metalness: 0.52,
    roughness: 0.2,
    emissive: 0x063e78,
    emissiveIntensity: 0.44,
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.28, 2), coreMaterial);
  world.add(core);

  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.52, 2),
    new THREE.MeshBasicMaterial({ color: 0x10b9d0, wireframe: true, transparent: true, opacity: 0.38 }),
  );
  world.add(wire);

  const orbit = new THREE.Group();
  const rings = [
    [2.1, 0x10b9d0, 0.72, 0.2, 0.1],
    [2.58, 0xf7bf27, -0.48, -0.28, 0.46],
    [3.02, 0xef8b39, 0.25, 0.44, -0.12],
  ];
  rings.forEach(([radius, color, x, y, z]) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.026, 12, 100),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 }),
    );
    ring.rotation.set(x, y, z);
    orbit.add(ring);
  });
  world.add(orbit);

  const blocks = new THREE.Group();
  const blockGeometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
  const blockColors = [0xf7bf27, 0x10b9d0, 0xef8b39, 0xffffff];
  for (let index = 0; index < 14; index += 1) {
    const angle = (index / 14) * Math.PI * 2;
    const radius = 2.35 + (index % 3) * 0.25;
    const block = new THREE.Mesh(
      blockGeometry,
      new THREE.MeshStandardMaterial({ color: blockColors[index % blockColors.length], metalness: 0.3, roughness: 0.32 }),
    );
    block.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.6) * 1.3, Math.sin(angle) * 0.8);
    block.rotation.set(angle, angle * 0.7, -angle * 0.3);
    blocks.add(block);
  }
  world.add(blocks);

  const stars = new THREE.BufferGeometry();
  const starPositions = [];
  for (let index = 0; index < 120; index += 1) {
    starPositions.push((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 3 - 1);
  }
  stars.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
  world.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0x10b9d0, size: 0.025, transparent: true, opacity: 0.68 })));

  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  const keyLight = new THREE.PointLight(0x10b9d0, 22, 13, 2);
  keyLight.position.set(3, 3, 4);
  const warmLight = new THREE.PointLight(0xf7bf27, 18, 10, 2);
  warmLight.position.set(-3.2, -1.4, 3);
  scene.add(ambient, keyLight, warmLight);

  const modes = [
    { name: "Mavi rejim", core: 0x087ec4, glow: 0x10b9d0, warm: 0xf7bf27 },
    { name: "Günəş rejimi", core: 0xf7bf27, glow: 0xef8b39, warm: 0xffffff },
    { name: "Yaradıcılıq rejimi", core: 0xef8b39, glow: 0x10b9d0, warm: 0xf7bf27 },
  ];
  let modeIndex = 0;
  let targetX = 0;
  let targetY = 0;
  let currentColor = new THREE.Color(modes[0].core);
  let targetColor = currentColor.clone();

  const setMode = (mode) => {
    targetColor.setHex(mode.core);
    coreMaterial.emissive.setHex(mode.glow);
    keyLight.color.setHex(mode.glow);
    warmLight.color.setHex(mode.warm);
    wire.material.color.setHex(mode.glow);
    control.textContent = mode.name;
  };

  const resize = () => {
    const bounds = stage.getBoundingClientRect();
    renderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });

  const setSceneColor = (hex, label) => {
    targetColor.set(hex);
    coreMaterial.emissive.set(hex);
    keyLight.color.set(hex);
    wire.material.color.set(hex);
    if (label) control.textContent = label;
  };

  control.addEventListener("click", () => {
    modeIndex = (modeIndex + 1) % modes.length;
    setMode(modes[modeIndex]);
  });

  canvas.addEventListener("pointermove", (event) => {
    const bounds = canvas.getBoundingClientRect();
    targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.8;
    targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.5;
  });
  canvas.addEventListener("pointerleave", () => {
    targetX = 0;
    targetY = 0;
  });
  canvas.addEventListener("click", () => control.click());

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const selected = card.classList.contains("is-selected");
      cards.forEach((item) => {
        item.classList.remove("is-selected");
        item.setAttribute("aria-pressed", "false");
      });
      if (selected) {
        setMode(modes[modeIndex]);
        message.textContent = "Bir istiqamət seç, 3D səhnənin enerjisi dəyişsin.";
        return;
      }
      card.classList.add("is-selected");
      card.setAttribute("aria-pressed", "true");
      const program = card.dataset.program;
      setSceneColor(card.dataset.color, `${program} rejimi`);
      message.textContent = `${program} seçildi — 3D səhnə həmin istiqamətin rənginə keçdi.`;
    });
  });

  const clock = new THREE.Clock();
  const render = () => {
    const elapsed = clock.getElapsedTime();
    const scrollProgress = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.4);
    world.rotation.y += (targetX + scrollProgress * 0.32 - world.rotation.y) * 0.045;
    world.rotation.x += (-targetY + scrollProgress * 0.08 - world.rotation.x) * 0.045;
    orbit.rotation.z = elapsed * 0.11;
    wire.rotation.y = -elapsed * 0.2;
    core.rotation.set(elapsed * 0.19, elapsed * 0.27, elapsed * 0.08);
    blocks.rotation.y = elapsed * 0.14;
    blocks.rotation.x = Math.sin(elapsed * 0.42) * 0.14;
    blocks.children.forEach((block, index) => { block.position.y += Math.sin(elapsed * 1.25 + index) * 0.0018; });
    currentColor.lerp(targetColor, 0.06);
    coreMaterial.color.copy(currentColor);
    renderer.render(scene, camera);
    if (!reducedMotion) requestAnimationFrame(render);
  };
  render();
} catch {
  canvas.closest(".three-stage")?.remove();
}
