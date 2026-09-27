import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const canvas = document.querySelector("#hero-canvas");
const control = document.querySelector("#orbit-control");
const cards = [...document.querySelectorAll(".program-card")];
const message = document.querySelector("#program-message");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const s = (value) => window.CoolabI18n?.source?.(value) ?? value;

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
    control.textContent = s(mode.name);
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
    const highlightProgram = () => {
      cards.forEach((item) => {
        item.classList.remove("is-selected");
      });
      card.classList.add("is-selected");
      const program = card.dataset.program;
      const localizedProgram = s(program);
      const language = window.CoolabI18n?.locale ?? "az";
      setSceneColor(card.dataset.color, language === "en" ? `${localizedProgram} mode` : language === "ru" ? `Режим: ${localizedProgram}` : `${localizedProgram} rejimi`);
      message.textContent = language === "en"
        ? `${localizedProgram} is selected — the 3D scene now uses this track’s colour.`
        : language === "ru"
          ? `Выбрано направление «${localizedProgram}» — 3D-сцена получила его цвет.`
          : `${localizedProgram} seçildi — 3D səhnə həmin istiqamətin rənginə keçdi.`;
    };
    card.addEventListener("pointerenter", highlightProgram);
    card.addEventListener("focusin", highlightProgram);
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

const byId = (id) => document.getElementById(id);
const robotCanvas = byId("builder-canvas");
const robotStatus = byId("robot-status");
const skillValues = { tech: 72, creative: 64, team: 81, leader: 58, present: 61 };

const updateSkills = () => {
  const polygon = byId("skill-polygon");
  const progressList = byId("progress-list");
  const stats = [skillValues.tech, skillValues.creative, skillValues.team, skillValues.leader, skillValues.present];
  const points = stats.map((value, index) => {
    const angle = -Math.PI / 2 + index * ((Math.PI * 2) / 5);
    const radius = 20 + value * 0.68;
    return `${(100 + Math.cos(angle) * radius).toFixed(1)},${(100 + Math.sin(angle) * radius).toFixed(1)}`;
  });
  if (polygon) polygon.setAttribute("points", points.join(" "));
  if (progressList) {
    progressList.replaceChildren();
    [
      ["Texnologiya", skillValues.tech],
      ["Yaradıcılıq", skillValues.creative],
      ["Komanda işi", skillValues.team],
      ["Liderlik", skillValues.leader],
      ["Təqdimat", skillValues.present],
    ].forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "progress-row";
      const labelNode = document.createElement("span");
      labelNode.textContent = s(label);
      const track = document.createElement("div");
      track.className = "progress-track";
      const fill = document.createElement("div");
      fill.className = "progress-fill";
      fill.style.width = `${value}%`;
      track.append(fill);
      const valueNode = document.createElement("b");
      valueNode.textContent = `${value}%`;
      row.append(labelNode, track, valueNode);
      progressList.append(row);
    });
  }
  const parentTech = byId("parent-tech");
  const parentCreative = byId("parent-creative");
  const parentTeam = byId("parent-team");
  if (parentTech) parentTech.style.width = `${skillValues.tech}%`;
  if (parentCreative) parentCreative.style.width = `${skillValues.creative}%`;
  if (parentTeam) parentTeam.style.width = `${skillValues.team}%`;
};

const addSkill = (skill, amount = 4) => {
  if (!Object.prototype.hasOwnProperty.call(skillValues, skill)) return;
  skillValues[skill] = Math.min(96, skillValues[skill] + amount);
  updateSkills();
};

document.querySelectorAll("[data-skill]").forEach((button) => {
  button.addEventListener("click", () => {
    const mapping = { tech: "tech", creative: "creative", team: "team", present: "present" };
    addSkill(mapping[button.dataset.skill]);
  });
});
updateSkills();

if (robotCanvas) {
  const robotState = { head: "cube", body: "blue", move: "wheels" };
  const renderer = new THREE.WebGLRenderer({ canvas: robotCanvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.6, 7.1);
  const robot = new THREE.Group();
  const platform = new THREE.Group();
  scene.add(robot, platform, new THREE.AmbientLight(0xffffff, 1.6));
  const blueLight = new THREE.PointLight(0x10b9d0, 30, 12, 2);
  blueLight.position.set(3, 4, 4);
  const warmLight = new THREE.PointLight(0xf7bf27, 16, 10, 2);
  warmLight.position.set(-3, 0, 3);
  scene.add(blueLight, warmLight);
  let targetRotation = 0;
  let isDragging = false;
  let lastPointerX = 0;

  const material = (color, metalness = 0.35) => new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.28 });
  const addPart = (geometry, color, position, rotation = [0, 0, 0]) => {
    const part = new THREE.Mesh(geometry, material(color));
    part.position.set(...position);
    part.rotation.set(...rotation);
    robot.add(part);
    return part;
  };
  const rebuildRobot = () => {
    robot.clear();
    const bodyColor = { blue: 0x087ec4, yellow: 0xf7bf27, orange: 0xef8b39 }[robotState.body];
    const headGeometry = robotState.head === "round" ? new THREE.SphereGeometry(0.76, 32, 20) : new THREE.BoxGeometry(1.35, 1.02, 1.1);
    addPart(new THREE.BoxGeometry(1.6, 1.48, 1.05), bodyColor, [0, 0.1, 0]);
    addPart(headGeometry, 0xdff7ff, [0, 1.38, 0]);
    addPart(new THREE.SphereGeometry(0.13, 18, 12), 0x073b70, [-0.3, 1.4, 0.55]);
    addPart(new THREE.SphereGeometry(0.13, 18, 12), 0x073b70, [0.3, 1.4, 0.55]);
    addPart(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 16), 0x10b9d0, [-1.22, 0.14, 0], [0, 0, Math.PI / 2]);
    addPart(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 16), 0x10b9d0, [1.22, 0.14, 0], [0, 0, Math.PI / 2]);
    if (robotState.move === "hover") {
      addPart(new THREE.TorusGeometry(0.86, 0.12, 16, 34), 0x10b9d0, [0, -0.95, 0], [Math.PI / 2, 0, 0]);
      addPart(new THREE.CylinderGeometry(0.64, 0.9, 0.28, 28), 0xeffbff, [0, -0.94, 0]);
    } else {
      [-0.7, 0.7].forEach((x) => addPart(new THREE.CylinderGeometry(0.46, 0.46, 0.3, 24), 0x11233b, [x, -0.86, 0], [Math.PI / 2, 0, 0]));
    }
    const labels = { blue: s("Mavi"), yellow: s("Sarı"), orange: s("Narıncı") };
    robotStatus.textContent = s(`${labels[robotState.body]} ${robotState.move === "hover" ? "uçan" : "təkərli"} kəşf robotu hazırdır.`);
  };
  const resize = () => {
    const bounds = robotCanvas.getBoundingClientRect();
    renderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / Math.max(bounds.height, 1);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });
  robotCanvas.addEventListener("pointerdown", (event) => { isDragging = true; lastPointerX = event.clientX; robotCanvas.setPointerCapture(event.pointerId); });
  robotCanvas.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    targetRotation += (event.clientX - lastPointerX) * 0.012;
    lastPointerX = event.clientX;
  });
  robotCanvas.addEventListener("pointerup", () => { isDragging = false; });
  document.querySelectorAll("[data-robot-part]").forEach((button) => {
    button.addEventListener("click", () => {
      const part = button.dataset.robotPart;
      robotState[part] = button.dataset.robotValue;
      document.querySelectorAll(`[data-robot-part="${part}"]`).forEach((item) => item.classList.toggle("is-active", item === button));
      rebuildRobot();
      addSkill("tech", 2);
    });
  });
  const clock = new THREE.Clock();
  const renderRobot = () => {
    const elapsed = clock.getElapsedTime();
    robot.rotation.y += (targetRotation + Math.sin(elapsed * 0.55) * 0.16 - robot.rotation.y) * 0.04;
    robot.position.y = Math.sin(elapsed * 1.15) * 0.1;
    platform.rotation.y = elapsed * 0.12;
    renderer.render(scene, camera);
    if (!reducedMotion) requestAnimationFrame(renderRobot);
  };
  rebuildRobot();
  renderRobot();
}

const ideaForm = byId("idea-form");
const ideaOutput = byId("idea-output");
if (ideaForm && ideaOutput) {
  const ideaPresets = document.querySelectorAll("[data-idea-track]");
  const projectIdeas = {
    robotics: {
      course: "Robototexnika", title: (topic) => `“${topic} üçün ağıllı sistem”`,
      text: (topic) => `“${topic}” mövzusunda sensor və LED-lərlə işləyən kiçik robototexnika prototipi qurun.`,
      steps: ["Problemi və ölçəcəyiniz məlumatı seçin.", "Sensoru, LED-ləri və maketi birləşdirin.", "Sınaq nəticəsini komandanıza təqdim edin."],
      skill: "tech",
    },
    design: {
      course: "Qrafik dizayn", title: (topic) => `“${topic}” üçün vizual hekayə`,
      text: (topic) => `“${topic}” mövzusunu üç vizual kadr və vahid rəng palitrası ilə izah edən dizayn seriyası hazırlayın.`,
      steps: ["Mesajı və auditoriyanı müəyyən edin.", "Rəng palitrası, şrift və kompozisiya seçin.", "Poster və sosial media vizualını təqdim edin."],
      skill: "creative",
    },
    ai: {
      course: "Süni intellekt", title: (topic) => `“${topic}” üçün ağıllı araşdırma`,
      text: (topic) => `“${topic}” haqqında etibarlı mənbələri və süni intellektdən alınan cavabları müqayisə edən kiçik araşdırma hazırlayın.`,
      steps: ["Araşdırma sualını və mənbələri seçin.", "Dəqiq sorğu yazın, cavabları yoxlayın.", "Nəticəni infoqrafika ilə izah edin."],
      skill: "tech",
    },
    programming: {
      course: "Proqramlaşdırma", title: (topic) => `“${topic}” üçün mini tətbiq`,
      text: (topic) => `“${topic}” mövzusunda istifadəçiyə fayda verən sadə, interaktiv veb səhifə və ya oyun yaradın.`,
      steps: ["İstifadəçini və əsas funksiyanı müəyyən edin.", "Ekranları planlayın, ilk versiyanı kodlayın.", "Dostunuzla test edin və təkmilləşdirin."],
      skill: "tech",
    },
  };

  const formatCopy = {
    team: "Komandada tədqiqatçı, dizayner və təqdimatçı rollarını bölüşdürün.",
    solo: "Fərdi eskizlə başlayın, sonra mentorla növbəti addımı seçin.",
    camp: "Düşərgədə sürətli prototip qurub günün sonunda nümayiş etdirin.",
  };

  const renderIdea = ({ interest, track, age, format }) => {
    const idea = projectIdeas[track] ?? projectIdeas.robotics;
    const topic = interest || "gələcək şəhər";
    ideaOutput.replaceChildren();

    const meta = document.createElement("div");
    meta.className = "idea-result-meta";
    [idea.course, age, format === "team" ? "Komanda ilə" : format === "solo" ? "Fərdi" : "Düşərgə üçün"].forEach((value) => {
      const tag = document.createElement("span");
      tag.textContent = value;
      meta.append(tag);
    });
    const title = document.createElement("strong");
    title.textContent = idea.title(topic);
    const copy = document.createElement("p");
    copy.textContent = `${idea.text(topic)} ${formatCopy[format]}`;
    const plan = document.createElement("div");
    plan.className = "idea-plan";
    ["Planla", "Hazırla", "Təqdim et"].forEach((label, index) => {
      const step = document.createElement("div");
      step.className = "idea-step";
      const heading = document.createElement("b");
      heading.textContent = `${index + 1}. ${label}`;
      step.append(heading, document.createTextNode(idea.steps[index]));
      plan.append(step);
    });
    ideaOutput.append(meta, title, copy, plan);
    addSkill(idea.skill, 5);
  };

  ideaPresets.forEach((preset) => {
    preset.addEventListener("click", () => {
      byId("idea-track").value = preset.dataset.ideaTrack;
      byId("idea-interest").value = preset.dataset.ideaInterest;
      ideaPresets.forEach((item) => item.classList.toggle("is-active", item === preset));
    });
  });

  ideaForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderIdea({
      interest: byId("idea-interest").value.trim(),
      track: byId("idea-track").value,
      age: byId("idea-age").value,
      format: byId("idea-format").value,
    });
  });
}

const gameBoard = byId("game-board");
const gameTarget = byId("game-target");
const gameStart = byId("game-start");
const gameStatus = byId("game-lab-status");
const labAccountLink = byId("lab-account-link");
const publicDemoKey = "coolab.energy-demo.completed";
const labApiBase = window.CoolabApiUrl
  ?? (window.location.port === "7103"
    ? `${window.location.origin}/api/v1`
    : "https://localhost:7103/api/v1");
let gameTimer;
let gameScore = 0;
let gameTime = 30;
let activeGameSession = null;
let activeArSession = null;

const readLabSession = () => {
  try { return JSON.parse(localStorage.getItem("coolab.auth") ?? "null"); }
  catch { return null; }
};

const isStudentAccount = () => {
  const user = readLabSession()?.user;
  return user?.roles?.some((role) => String(role).toLowerCase() === "student") ?? false;
};

const labCopy = () => ({
  az: {
    minute: "dəq", second: "san", publicDemoReady: "Qeydiyyatsız bir demo oyun açıqdır.",
    demoFinished: "Demo tamamlandı. Digər oyunlar şagird kabinetində açılır.",
    demoAlready: "Demo artıq oynanılıb. Tam laboratoriyanı açmaq üçün şagird hesabı yarat.",
    labTimeLeft: (time) => `Bu gün laboratoriya üçün ${time} vaxtın qalıb.`,
    labDone: "Bu günkü laboratoriya vaxtın tamamlandı. Sabah yenidən davam edə bilərsən.",
    checkTime: "Laboratoriya vaxtını yoxlamaq üçün səhifəni yenilə.",
    startSession: (time) => `Laboratoriya sessiyası açıldı. Bu gün ${time} vaxtın qalıb.`,
    resultSaved: (time) => `Nəticən kabinetində yadda saxlandı. Bu gün ${time} vaxtın qalıb.`,
    resultSavedDone: "Nəticən kabinetində yadda saxlandı. Bu günkü laboratoriya vaxtın tamamlandı.",
    demoFinishedRegister: "Demo tamamlandı. Digər oyunları oynamaq üçün şagird kimi qeydiyyatdan keç.",
    robotOpen: (time) => `Robot studiyası açıqdır. Bu gün ${time} vaxtın qalıb.`,
    arOpen: (time) => `AR laboratoriyası açıldı. Bu gün ${time} vaxtın qalıb.`,
    arFinished: (time) => `AR sessiyası tamamlandı. Bu gün ${time} vaxtın qalıb.`,
    arFinishedDone: "Bu günkü laboratoriya vaxtın tamamlandı.",
  },
  en: {
    minute: "min", second: "sec", publicDemoReady: "One public demo game is available.",
    demoFinished: "The demo is complete. Other games open in the student dashboard.",
    demoAlready: "This demo has already been played. Create a student account to open the full lab.",
    labTimeLeft: (time) => `You have ${time} of lab time left today.`,
    labDone: "Your lab time for today is complete. You can continue tomorrow.",
    checkTime: "Refresh the page to check your lab time.",
    startSession: (time) => `Your lab session is open. You have ${time} left today.`,
    resultSaved: (time) => `Your result was saved in your dashboard. You have ${time} left today.`,
    resultSavedDone: "Your result was saved in your dashboard. Your lab time for today is complete.",
    demoFinishedRegister: "The demo is complete. Register as a student to play the other games.",
    robotOpen: (time) => `Robot Studio is open. You have ${time} left today.`,
    arOpen: (time) => `The AR lab is open. You have ${time} left today.`,
    arFinished: (time) => `The AR session is complete. You have ${time} left today.`,
    arFinishedDone: "Your lab time for today is complete.",
  },
  ru: {
    minute: "мин", second: "сек", publicDemoReady: "Доступна одна открытая демо-игра.",
    demoFinished: "Демо завершено. Остальные игры доступны в кабинете ученика.",
    demoAlready: "Демо уже пройдено. Создайте аккаунт ученика, чтобы открыть всю лабораторию.",
    labTimeLeft: (time) => `Сегодня у вас осталось ${time} времени в лаборатории.`,
    labDone: "Время лаборатории на сегодня завершено. Продолжите завтра.",
    checkTime: "Обновите страницу, чтобы проверить время лаборатории.",
    startSession: (time) => `Сессия лаборатории открыта. Сегодня у вас осталось ${time}.`,
    resultSaved: (time) => `Результат сохранён в кабинете. Сегодня у вас осталось ${time}.`,
    resultSavedDone: "Результат сохранён в кабинете. Время лаборатории на сегодня завершено.",
    demoFinishedRegister: "Демо завершено. Зарегистрируйтесь как ученик, чтобы играть в остальные игры.",
    robotOpen: (time) => `Студия робота открыта. Сегодня у вас осталось ${time}.`,
    arOpen: (time) => `AR-лаборатория открыта. Сегодня у вас осталось ${time}.`,
    arFinished: (time) => `AR-сессия завершена. Сегодня у вас осталось ${time}.`,
    arFinishedDone: "Время лаборатории на сегодня завершено.",
  },
}[window.CoolabI18n?.locale ?? "az"] ?? {
  minute: "dəq", second: "san", publicDemoReady: "Qeydiyyatsız bir demo oyun açıqdır.",
  demoFinished: "Demo tamamlandı. Digər oyunlar şagird kabinetində açılır.", demoAlready: "Demo artıq oynanılıb.",
  labTimeLeft: (time) => `Bu gün laboratoriya üçün ${time} vaxtın qalıb.`, labDone: "Bu günkü laboratoriya vaxtın tamamlandı.",
  checkTime: "Laboratoriya vaxtını yoxlamaq üçün səhifəni yenilə.", startSession: (time) => `Laboratoriya sessiyası açıldı. Bu gün ${time} vaxtın qalıb.`,
  resultSaved: (time) => `Nəticən kabinetində yadda saxlandı. Bu gün ${time} vaxtın qalıb.`, resultSavedDone: "Nəticən kabinetində yadda saxlandı.",
  demoFinishedRegister: "Demo tamamlandı.", robotOpen: (time) => `Robot studiyası açıqdır. Bu gün ${time} vaxtın qalıb.`,
  arOpen: (time) => `AR laboratoriyası açıldı. Bu gün ${time} vaxtın qalıb.`, arFinished: (time) => `AR sessiyası tamamlandı. Bu gün ${time} vaxtın qalıb.`, arFinishedDone: "Bu günkü laboratoriya vaxtın tamamlandı.",
});

const formatLabTime = (seconds = 0) => {
  const copy = labCopy();
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainingSeconds = Math.max(0, seconds) % 60;
  return minutes ? `${minutes} ${copy.minute} ${remainingSeconds} ${copy.second}` : `${remainingSeconds} ${copy.second}`;
};

const setGameStatus = (message) => {
  if (gameStatus) gameStatus.textContent = message;
};

const labRequest = async (path, options = {}) => {
  const session = readLabSession();
  if (!session?.accessToken) throw new Error("Laboratoriyanı açmaq üçün şagird hesabı ilə daxil olun.");
  const response = await fetch(`${labApiBase}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}`, ...(options.headers ?? {}) },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.detail || payload?.title || "Laboratoriya hazırda açıla bilmədi.");
  return payload;
};

const startLabSession = (activitySlug) => labRequest("/student/lab/sessions", {
  method: "POST",
  body: JSON.stringify({ activitySlug }),
});

const finishLabSession = (sessionId) => sessionId
  ? labRequest(`/student/lab/sessions/${sessionId}/complete`, { method: "POST" })
  : Promise.resolve(null);

const updateLabEntryState = async () => {
  const copy = labCopy();
  const student = isStudentAccount();
  document.querySelectorAll("[data-lab-protected]").forEach((panel) => panel.classList.toggle("is-locked", !student));
  if (labAccountLink) labAccountLink.hidden = !student;
  if (!student) {
    setGameStatus(localStorage.getItem(publicDemoKey) ? copy.demoFinished : copy.publicDemoReady);
    return;
  }
  try {
    const allowance = await labRequest("/student/lab/allowance");
    setGameStatus(allowance.remainingSeconds > 0 ? copy.labTimeLeft(formatLabTime(allowance.remainingSeconds)) : copy.labDone);
  } catch {
    setGameStatus(copy.checkTime);
  }
};

const saveGameScore = async (score, labSessionId = null) => {
  if (!isStudentAccount()) return;
  try {
    await labRequest("/student/games/energy-collection/progress", {
      method: "POST",
      body: JSON.stringify({ score, labSessionId }),
    });
  } catch {
    setGameStatus("Nəticə bu dəfə yadda saxlanmadı. Yenidən cəhd edə bilərsən.");
  }
};
const placeTarget = () => {
  const bounds = gameBoard.getBoundingClientRect();
  const left = 20 + Math.random() * Math.max(10, bounds.width - 76);
  const top = 20 + Math.random() * Math.max(10, bounds.height - 76);
  gameTarget.style.left = `${left}px`;
  gameTarget.style.top = `${top}px`;
};
if (gameBoard && gameTarget && gameStart) {
  gameTarget.addEventListener("click", () => {
    if (!gameTimer) return;
    gameScore += 1;
    byId("game-score").textContent = gameScore;
    placeTarget();
    addSkill("tech", 1);
  });
  gameStart.addEventListener("click", async () => {
    if (gameTimer) return;
    if (!isStudentAccount() && localStorage.getItem(publicDemoKey)) {
      setGameStatus(labCopy().demoAlready);
      document.querySelector('[data-auth-open="register"]')?.click();
      return;
    }
    gameStart.disabled = true;
    if (isStudentAccount()) {
      try {
        activeGameSession = await startLabSession("energy-collection");
        gameTime = Math.min(30, activeGameSession.sessionLimitSeconds);
        setGameStatus(labCopy().startSession(formatLabTime(activeGameSession.remainingDailySeconds)));
      } catch (error) {
        gameStart.disabled = false;
        setGameStatus(error.message);
        return;
      }
    } else {
      activeGameSession = null;
      gameTime = 30;
    }
    gameScore = 0;
    byId("game-score").textContent = "0";
    byId("game-time").textContent = gameTime;
    gameStart.textContent = s("Enerjini topla!");
    gameTarget.classList.add("is-visible");
    placeTarget();
    gameTimer = window.setInterval(() => {
      gameTime -= 1;
      byId("game-time").textContent = gameTime;
      if (gameTime <= 0) {
        clearInterval(gameTimer);
        gameTimer = undefined;
        gameTarget.classList.remove("is-visible");
        gameStart.disabled = false;
        gameStart.textContent = `${gameScore} ${s("xal — yenidən oyna")}`;
        addSkill("tech", Math.min(8, Math.ceil(gameScore / 2)));
        if (isStudentAccount()) {
          const completedGameSession = activeGameSession;
          activeGameSession = null;
          void finishLabSession(completedGameSession?.sessionId).then(async (allowance) => {
            await saveGameScore(gameScore, completedGameSession?.sessionId);
            setGameStatus(allowance?.remainingSeconds > 0
              ? labCopy().resultSaved(formatLabTime(allowance.remainingSeconds))
              : labCopy().resultSavedDone);
          });
        } else {
          localStorage.setItem(publicDemoKey, "true");
          setGameStatus(labCopy().demoFinishedRegister);
        }
      }
    }, 1000);
  });
}

document.querySelectorAll("#robot-builder .part-choice").forEach((button) => {
  button.addEventListener("click", async () => {
    if (!isStudentAccount()) return;
    try {
      const session = await startLabSession("robot-builder");
      setGameStatus(labCopy().robotOpen(formatLabTime(session.remainingDailySeconds)));
    } catch (error) {
      setGameStatus(error.message);
    }
  });
});

void updateLabEntryState();
window.addEventListener("coolab:authchange", () => { void updateLabEntryState(); });

const calendarData = [
  { month: "Sentyabr 2026", events: [{ day: "14", title: "Robot missiyası", info: "Sensorlar və təkərli robotlarla açıq laboratoriya." }, { day: "21", title: "Dizayn günü", info: "Poster və rəqəmsal hekayə workshopu." }, { day: "27", title: "Ailə təqdimatı", info: "Uşaqlar həftəlik layihələrini ailələrinə göstərir." }] },
  { month: "Oktyabr 2026", events: [{ day: "05", title: "Payız düşərgəsi", info: "3 günlük oyun, elm və komanda təcrübəsi." }, { day: "18", title: "Oyun laboratoriyası", info: "Öz oyun ideyanı prototipə çevir." }, { day: "30", title: "Demo axşamı", info: "Komandalar işlərini səhnədə paylaşır." }] },
  { month: "Noyabr 2026", events: [{ day: "08", title: "Kosmos həftəsi", info: "Raket modeli və ulduz xəritəsi layihəsi." }, { day: "16", title: "Liderlik oyunu", info: "Qərar vermək və komandanı dinləmək üçün missiyalar." }, { day: "28", title: "Qışa hazırlıq", info: "Yeni kamp proqramları ilə tanışlıq günü." }] },
];
let calendarIndex = 0;
const renderCalendar = () => {
  const entry = calendarData[calendarIndex];
  byId("calendar-month").textContent = s(entry.month);
  const list = byId("calendar-list");
  list.replaceChildren();
  entry.events.forEach((event, index) => {
    const button = document.createElement("button");
    button.className = "calendar-event";
    button.type = "button";
    const date = document.createElement("time");
    date.textContent = event.day;
    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = s(event.title);
    const note = document.createElement("small");
    note.textContent = s("Detallara bax");
    copy.append(title, note);
    button.append(date, copy);
    button.addEventListener("click", () => {
      list.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
      byId("calendar-detail").textContent = `${event.day} — ${s(event.info)}`;
    });
    if (index === 0) button.classList.add("is-active");
    list.append(button);
  });
  byId("calendar-detail").textContent = `${entry.events[0].day} — ${s(entry.events[0].info)}`;
};
if (byId("calendar-prev") && byId("calendar-next")) {
  byId("calendar-prev").addEventListener("click", () => { calendarIndex = (calendarIndex + calendarData.length - 1) % calendarData.length; renderCalendar(); });
  byId("calendar-next").addEventListener("click", () => { calendarIndex = (calendarIndex + 1) % calendarData.length; renderCalendar(); });
  renderCalendar();
}

const chatMessages = byId("chat-messages");
const addChatMessage = (text, type = "bot") => {
  const messageNode = document.createElement("div");
  messageNode.className = `chat-message${type === "user" ? " user" : ""}`;
  messageNode.textContent = text;
  chatMessages.append(messageNode);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return messageNode;
};
const salesChatBase = window.CoolabApiUrl ?? (window.location.port === "7103" ? `${window.location.origin}/api/v1` : "https://localhost:7103/api/v1");
const chatSessionKey = "coolab.sales-chat-session";
const getChatSession = () => {
  const saved = localStorage.getItem(chatSessionKey);
  if (saved && saved.length <= 80) return saved;
  const created = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(chatSessionKey, created);
  return created;
};
const chatLeadForm = byId("chat-lead-form");
const showLeadForm = (suggestedProgram = "") => {
  if (!chatLeadForm) return;
  chatLeadForm.hidden = false;
  const program = byId("chat-suggested-program");
  if (program && suggestedProgram) program.value = suggestedProgram;
};
const publicApi = async (path, body) => {
  const response = await fetch(`${salesChatBase}${path}`, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body) });
  if (!response.ok) { const problem = await response.json().catch(() => null); throw new Error(problem?.detail || problem?.title || s("Çat hazırda əlçatan deyil. Bir qədər sonra yenidən cəhd edin.")); }
  return response.json();
};
const sendChat = async (text) => {
  const messageText = text.trim();
  if (!messageText) return;
  addChatMessage(messageText, "user");
  const typing = addChatMessage(s("Yazır…")); typing.classList.add("typing");
  const input = byId("chat-input"); const submit = byId("chat-form")?.querySelector("button");
  if (input) input.disabled = true; if (submit) submit.disabled = true;
  try {
    const result = await publicApi("/sales-chat/messages", { sessionId:getChatSession(), message:messageText, locale:window.CoolabI18n?.locale ?? "az" });
    localStorage.setItem(chatSessionKey, result.sessionId);
    typing.remove(); addChatMessage(result.reply);
    if (result.showContactForm || result.requiresHuman) showLeadForm(result.suggestedProgram);
  } catch (error) { typing.remove(); addChatMessage(error.message); }
  finally { if (input) input.disabled = false; if (submit) submit.disabled = false; input?.focus(); }
};
byId("chat-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = byId("chat-input");
  void sendChat(input.value);
  input.value = "";
});
document.querySelectorAll(".quick-prompt").forEach((button) => button.addEventListener("click", () => {
  if (button.id === "chat-human-button") { showLeadForm(); addChatMessage(s("Əlaqə formasını doldurun, proqram mütəxəssisi sizə cavab versin.")); return; }
  void sendChat(button.textContent);
}));
chatLeadForm?.addEventListener("submit", async (event) => {
  event.preventDefault(); const form = event.currentTarget; const feedback = byId("chat-lead-feedback"); const submit = form.querySelector("button"); const values = new FormData(form);
  submit.disabled = true; if (feedback) feedback.textContent = s("Göndərilir…");
  try {
    await publicApi("/sales-chat/leads", { sessionId:getChatSession(), fullName:values.get("fullName"), contact:values.get("contact"), childAge:values.get("childAge") ? Number(values.get("childAge")) : null, interests:values.get("interests") || null, suggestedProgram:values.get("suggestedProgram") || null, consentToContact:values.get("consentToContact") === "on" });
    form.reset(); if (feedback) feedback.textContent = s("Sorğunuz satış komandasına ötürüldü. Tezliklə sizinlə əlaqə saxlayacağıq.");
  } catch (error) { if (feedback) feedback.textContent = error.message; }
  finally { submit.disabled = false; }
});

const arVideo = byId("ar-video");
const arCanvas = byId("ar-canvas");
const arStatus = byId("ar-status");
let cameraStream;
let arRenderer;
let arRunning = false;
let arRender;
const setupArOverlay = () => {
  if (arRenderer || !arCanvas) return arRender;
  arRenderer = new THREE.WebGLRenderer({ canvas: arCanvas, alpha: true, antialias: true });
  arRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.z = 6;
  const model = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 0.75), new THREE.MeshStandardMaterial({ color: 0x087ec4, metalness: 0.3, roughness: 0.24 }));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.68, 24, 18), new THREE.MeshStandardMaterial({ color: 0xf7bf27, metalness: 0.2, roughness: 0.26 }));
  head.position.y = 1.2;
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.035, 12, 48), new THREE.MeshBasicMaterial({ color: 0x10b9d0 }));
  halo.rotation.x = 0.8;
  model.add(body, head, halo);
  scene.add(model, new THREE.AmbientLight(0xffffff, 1.7));
  const light = new THREE.PointLight(0x10b9d0, 18, 8);
  light.position.set(2, 3, 3);
  scene.add(light);
  const resize = () => {
    const bounds = arCanvas.getBoundingClientRect();
    arRenderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / Math.max(bounds.height, 1);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });
  const clock = new THREE.Clock();
  arRender = () => {
    if (!arRunning) return;
    const time = clock.getElapsedTime();
    model.rotation.y = time * 0.55;
    model.position.y = Math.sin(time * 1.2) * 0.12;
    halo.rotation.z = time * 0.45;
    arRenderer.render(scene, camera);
    if (!reducedMotion) requestAnimationFrame(arRender);
  };
  return arRender;
};
byId("ar-start")?.addEventListener("click", async () => {
  if (isStudentAccount()) {
    try {
      activeArSession = await startLabSession("ar-robot");
      setGameStatus(labCopy().arOpen(formatLabTime(activeArSession.remainingDailySeconds)));
    } catch (error) {
      arStatus.textContent = error.message;
      return;
    }
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    arStatus.textContent = s("Bu brauzerdə kamera funksiyası əlçatan deyil.");
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    arVideo.srcObject = cameraStream;
    await arVideo.play();
    byId("ar-placeholder").classList.add("is-hidden");
    arRunning = true;
    const render = setupArOverlay();
    render?.();
    arStatus.textContent = s("AR səhnəsi aktivdir — robot görüntünün üzərindədir.");
    addSkill("tech", 4);
  } catch {
    if (activeArSession?.sessionId) void finishLabSession(activeArSession.sessionId);
    activeArSession = null;
    arStatus.textContent = s("Kamera açılmadı. İcazəni yoxla və yenidən cəhd et.");
  }
});
byId("ar-stop")?.addEventListener("click", () => {
  const completedArSession = activeArSession;
  activeArSession = null;
  if (completedArSession?.sessionId) {
    void finishLabSession(completedArSession.sessionId).then((allowance) => {
      if (allowance) setGameStatus(allowance.remainingSeconds > 0
        ? labCopy().arFinished(formatLabTime(allowance.remainingSeconds))
        : labCopy().arFinishedDone);
    });
  }
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = undefined;
  arRunning = false;
  if (arVideo) arVideo.srcObject = null;
  byId("ar-placeholder")?.classList.remove("is-hidden");
  arStatus.textContent = s("Kamera bağlandı.");
});

const portfolioStudents = [
  { name:"Mahir", image:"assets/mahir-robotics.jpg", program:"Robototexnika proqramı iştirakçısı · ilk müstəqil layihəsinə doğru irəliləyir.", journey:[["Başlanğıc","Robototexnika sahəsində əvvəlcədən layihə təcrübəsi yox idi."],["Öyrəndi","Elektronika, sensorlar və LED-lərlə işləmə məntiqini sınaqdan keçirdi."],["Yaratdı","Səs sensoru ilə idarə olunan LED sistemini müstəqil şəkildə qurdu."]], summary:"Robototexnika proqramına başlamazdan əvvəl Mahir bu sahədə heç bir layihə hazırlamamışdı. Proqramın sonunda isə öyrəndiyi bilikləri tətbiq edərək müstəqil layihələr qurdu.", skills:[["Elektronika əsasları","Qazandı"],["Sensor məntiqi","Qazandı"],["LED idarəetməsi","Qazandı"],["Prototipləşdirmə","Qazandı"],["Müstəqil problem həlli","Güclənir"],["Layihə təqdimatı","Güclənir"]], detailTitle:"Seçilmiş layihə: Səs sensoru ilə LED sistemi", detailIntro:"Layihənin ideyası:", detail:"səsi qəbul edən sensor vasitəsilə LED işıqların idarə olunması. Mahir öyrəndiyi bilikləri birləşdirərək işlək prototip hazırlayıb və layihəsini təqdim edib." },
  { name:"Vahid", image:"assets/portfolio/vahid.webp", program:"Coolab inkişaf proqramı iştirakçısı", journey:[["Əvvəl","Ünsiyyətdə daha çəkingən idi."],["Məşq etdi","Fəaliyyətlərdə uşaqlara qoşulmağa başladı."],["Bu gün","Kollektiv işlərdə daha aktivdir."]], summary:"Əvvəllər daha utancaq və ünsiyyətdə çəkingən olan Vahid, zamanla uşaqlara daha rahat qoşulmağa və özünü ifadə etməyə başladı. İndi isə kollektiv fəaliyyətlərdə daha aktiv iştirak edir və özünəinamını daha rahat göstərir.", skills:[["Ünsiyyət","Güclənir"],["Komanda işi","Aktiv"],["Özünüifadə","Güclənir"],["Sosial iştirak","Artır"]], detailTitle:"İnkişaf yönümü: Ünsiyyət və komanda işi", detailIntro:"İrəliləyiş:", detail:"Vahid qrup mühitində özünü daha rahat ifadə edir və kollektiv fəaliyyətlərdə aktiv rol almağa davam edir." },
  { name:"Muhsin", image:"assets/portfolio/muhsin.webp", program:"Coolab inkişaf proqramı iştirakçısı", journey:[["Əvvəl","Fəaliyyət zamanı diqqətini toplamaqda çətinlik çəkirdi."],["Məşq etdi","Enerjisini fəaliyyətlərə yönəltməyi öyrəndi."],["Bu gün","Məşğələlərdə daha sakit və fokuslu iştirak edir."]], summary:"İlk vaxtlarda daha hərəkətli və enerjili idi, fəaliyyət zamanı diqqətini toplamaqda çətinlik çəkirdi. İndi isə özünü daha yaxşı idarə edir, enerjisini fəaliyyətlərə yönəldir və məşğələlərdə daha sakit iştirak edir.", skills:[["Diqqətin idarəsi","Güclənir"],["Özünənəzarət","Güclənir"],["Məqsədyönlülük","Artır"],["Fəaliyyətə fokus","Aktiv"]], detailTitle:"İnkişaf yönümü: Fokus və özünənəzarət", detailIntro:"İrəliləyiş:", detail:"Muhsin enerjisini daha məqsədli istiqamətə yönəldərək məşğələlərdə diqqətli iştirakını gücləndirir." },
  { name:"Asim Mehdi", image:"assets/portfolio/asim.webp", program:"Coolab inkişaf proqramı iştirakçısı", journey:[["Əvvəl","Sosial fəaliyyətlərə az qoşulurdu."],["Məşq etdi","Ünsiyyət qurmaq üçün daha çox imkan yaratdı."],["Bu gün","Daha aktivdir və yeni dostlar qazanır."]], summary:"Əvvəllər daha sakit və ünsiyyətdə çəkingən idi, sosial fəaliyyətlərə az qoşulurdu. İndi isə daha aktiv və ünsiyyətcil olub, özünəinamı artıb və yeni dostlar qazanıb.", skills:[["Ünsiyyət","Güclənir"],["Sosial iştirak","Artır"],["Özünəinam","Güclənir"],["Dostluq qurma","Aktiv"]], detailTitle:"İnkişaf yönümü: Sosial iştirak", detailIntro:"İrəliləyiş:", detail:"Asim Mehdi qrupda daha fəal rol alır, ünsiyyətini və yeni dostluqlar qurmaq bacarığını inkişaf etdirir." },
  { name:"Sədaqət Mehdi", image:"assets/portfolio/sadaqat.webp", program:"Coolab inkişaf proqramı iştirakçısı", journey:[["Əvvəl","Qrup fəaliyyətlərinə qoşulmaqda çətinlik çəkirdi."],["Məşq etdi","Yeni təcrübələrə uyğunlaşmaq üçün addımlar atdı."],["Bu gün","Qrupda özünü daha sərbəst hiss edir."]], summary:"Əvvəllər qrup fəaliyyətlərinə qoşulmaqda çətinlik çəkir, yeni təcrübələrə uyğunlaşmaq üçün zamana ehtiyac duyurdu. İndi isə müxtəlif fəaliyyətlərə daha rahat qoşulur və qrup mühitində özünü daha sərbəst hiss edir.", skills:[["Uyğunlaşma","Güclənir"],["Qrupda iştirak","Aktiv"],["Yeni təcrübələr","Açıqdır"],["Özünəinam","Güclənir"]], detailTitle:"İnkişaf yönümü: Uyğunlaşma və qrup mühiti", detailIntro:"İrəliləyiş:", detail:"Sədaqət Mehdi müxtəlif fəaliyyətlərə daha rahat qoşulur və qrupda iştirakını davamlı şəkildə artırır." },
  { name:"Seyyid", image:"assets/portfolio/seyyid.webp", program:"Coolab inkişaf proqramı iştirakçısı", journey:[["Əvvəl","Daha çox öz bildiyi ilə kifayətlənirdi."],["Məşq etdi","Sual verməyə və maraqlanmağa başladı."],["Bu gün","Yeni şeyləri özü sınamağa çalışır."]], summary:"Seyyid əvvəllər daha çox öz bildiyi ilə kifayətlənirdi. İndi isə sual verir, maraqlanır və yeni şeyləri özü sınamağa çalışır.", skills:[["Sual vermə","Aktiv"],["Maraq","Artır"],["Tədqiqat","Güclənir"],["Müstəqil sınaq","Aktiv"]], detailTitle:"İnkişaf yönümü: Maraq və tədqiqat", detailIntro:"İrəliləyiş:", detail:"Seyyid sual vermək və yeni ideyaları özü sınamaq vərdişini inkişaf etdirir." },
  { name:"Həcər", image:"assets/portfolio/hacar.webp", program:"Coolab inkişaf proqramı iştirakçısı", journey:[["Əvvəl","Yeni mühitə uyğunlaşmaq üçün zamana ehtiyac duyurdu."],["Məşq etdi","Fəaliyyətlərdə kiçik addımlarla iştirak etdi."],["Bu gün","Özünü daha rahat hiss edir və aktivdir."]], summary:"Həcər əvvəlcə yeni mühitə uyğunlaşmaq üçün bir az zamana ehtiyac duyurdu. İndi isə özünü daha rahat hiss edir və fəaliyyətlərdə daha aktiv iştirak edir.", skills:[["Uyğunlaşma","Güclənir"],["Fəaliyyətə qoşulma","Aktiv"],["Sosial rahatlıq","Artır"],["İştirak","Güclənir"]], detailTitle:"İnkişaf yönümü: Rahat uyğunlaşma", detailIntro:"İrəliləyiş:", detail:"Həcər yeni mühitdə özünü daha rahat hiss edir və fəaliyyətlərdə aktiv iştirakını davam etdirir." },
  { name:"Zəhra", image:"assets/portfolio/zahra.webp", program:"Coolab inkişaf proqramı iştirakçısı", journey:[["Əvvəl","Bəzən özünü çəkingən hiss edirdi."],["Məşq etdi","Ünsiyyət və qrup fəaliyyətlərinə qoşuldu."],["Bu gün","Özünü daha rahat ifadə edir."]], summary:"Zəhranın əvvəlcə bir az çəkingən olduğu anlar olurdu. İndi isə həm ünsiyyətdə, həm də qrup fəaliyyətlərində özünü daha rahat göstərir.", skills:[["Ünsiyyət","Güclənir"],["Qrupda iştirak","Aktiv"],["Özünüifadə","Güclənir"],["Özünəinam","Artır"]], detailTitle:"İnkişaf yönümü: Özünüifadə", detailIntro:"İrəliləyiş:", detail:"Zəhra həm ünsiyyətdə, həm də qrup fəaliyyətlərində özünü daha inamla göstərir." },
  { name:"Mikayıl", image:"assets/portfolio/mikayil.webp", program:"Coolab inkişaf proqramı iştirakçısı", journey:[["Əvvəl","Komanda içində daha rahat ünsiyyət qurmağa başladı."],["Məşq etdi","Məsuliyyət götürərək tapşırıqlarda rol aldı."],["Bu gün","Tapşırıqlara yaradıcı yanaşır."]], summary:"Mikayıl zamanla komanda daxilində daha rahat ünsiyyət qurmağa, məsuliyyət götürməyə və qarşısına çıxan tapşırıqlara yaradıcı yanaşmağa başladı.", skills:[["Komanda işi","Aktiv"],["Məsuliyyət","Güclənir"],["Yaradıcı yanaşma","Aktiv"],["Ünsiyyət","Artır"]], detailTitle:"İnkişaf yönümü: Komanda və yaradıcılıq", detailIntro:"İrəliləyiş:", detail:"Mikayıl komanda işində məsuliyyət götürür və tapşırıqlara yaradıcı həll yolları axtarır." },
  { name:"Mustafa", image:"assets/portfolio/mustafa.webp", program:"Coolab inkişaf proqramı iştirakçısı", journey:[["Əvvəl","Fəaliyyətlərdə çox önə çıxmırdı."],["Məşq etdi","Uşaqlara qoşulmağa və fikirlərini bölüşməyə başladı."],["Bu gün","Daha aktiv və sərbəst iştirak edir."]], summary:"Əvvəllər daha sakit və öz dünyasında olan Mustafa fəaliyyətlərdə çox önə çıxmırdı. İndi isə uşaqlara daha rahat qoşulur, fikirlərini daha sərbəst ifadə edir və fəaliyyətlərdə daha aktiv iştirak edir.", skills:[["Qrupda iştirak","Aktiv"],["Fikir ifadəsi","Güclənir"],["Ünsiyyət","Artır"],["Özünəinam","Güclənir"]], detailTitle:"İnkişaf yönümü: Aktiv iştirak", detailIntro:"İrəliləyiş:", detail:"Mustafa qrup fəaliyyətlərində daha rahat iştirak edir və fikirlərini sərbəst ifadə etməyə davam edir." },
  { name:"Zeynəb", image:"assets/portfolio/zeyneb.webp", program:"Coolab inkişaf proqramı iştirakçısı", journey:[["Əvvəl","Yeni mühitə və insanlara uyğunlaşmaq üçün zamana ehtiyac duyurdu."],["Məşq etdi","Fəaliyyətlərə daha çox qoşuldu."],["Bu gün","Özünü sərbəst ifadə edir və aktivdir."]], summary:"Əvvəllər yeni mühitə və insanlara uyğunlaşmaq üçün daha çox zamana ehtiyac duyurdu. İndi isə uşaqlara daha rahat qoşulur, fəaliyyətlərdə aktiv iştirak edir və özünü daha sərbəst ifadə edir.", skills:[["Uyğunlaşma","Güclənir"],["Sosial iştirak","Aktiv"],["Özünüifadə","Artır"],["Özünəinam","Güclənir"]], detailTitle:"İnkişaf yönümü: Rahat iştirak", detailIntro:"İrəliləyiş:", detail:"Zeynəb yeni mühitdə daha rahat ünsiyyət qurur və qrup fəaliyyətlərində aktiv rol alır." },
];

const portfolioCard = byId("portfolio-card");
const portfolioCounter = byId("portfolio-counter");
const portfolioDots = byId("portfolio-dots");
let portfolioIndex = 0;
let portfolioAutoplayTimer = null;

const makePortfolioNode = (tag, className, copy = "") => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (copy) node.textContent = s(copy);
  return node;
};

const renderPortfolioCarousel = (nextIndex = portfolioIndex, animate = true) => {
  if (!portfolioCard || !portfolioStudents.length) return;
  const normalizedIndex = (nextIndex + portfolioStudents.length) % portfolioStudents.length;
  const forwardDistance = (normalizedIndex - portfolioIndex + portfolioStudents.length) % portfolioStudents.length;
  portfolioCard.dataset.transition = forwardDistance === 0 || forwardDistance <= portfolioStudents.length / 2 ? "next" : "previous";
  portfolioIndex = normalizedIndex;
  const profile = portfolioStudents[portfolioIndex];
  const student = makePortfolioNode("div", "portfolio-student");
  const image = document.createElement("img");
  image.src = profile.image;
  image.alt = `${profile.name} — ${s("Coolab fəaliyyətində şagird")}`;
  image.loading = "lazy";
  image.decoding = "async";
  const heading = document.createElement("div");
  heading.append(makePortfolioNode("span", "portfolio-label", "Coolab inkişaf xəritəsi"), makePortfolioNode("h3", "", profile.name), makePortfolioNode("p", "", profile.program));
  student.append(image, heading);

  const journeyHeading = makePortfolioNode("div", "portfolio-journey-title", "İnkişaf yolu");
  const years = makePortfolioNode("div", "portfolio-years");
  profile.journey.forEach(([stage, copy]) => {
    const item = makePortfolioNode("div", "portfolio-year");
    item.append(makePortfolioNode("strong", "", stage), document.createTextNode(s(copy)));
    years.append(item);
  });

  const summary = makePortfolioNode("div", "portfolio-summary", profile.summary);
  const skills = makePortfolioNode("div", "portfolio-skills");
  profile.skills.slice(0, 4).forEach(([label, status]) => {
    const skill = makePortfolioNode("div", "portfolio-skill", label);
    skill.append(makePortfolioNode("b", "", status));
    skills.append(skill);
  });

  const detail = document.createElement("details");
  detail.className = "portfolio-project-detail";
  detail.append(makePortfolioNode("summary", "", profile.detailTitle));
  const detailCopy = makePortfolioNode("div");
  detailCopy.append(makePortfolioNode("strong", "", profile.detailIntro), document.createTextNode(` ${s(profile.detail)}`));
  if (profile.skills.length > 4) {
    const extraSkills = makePortfolioNode("span", "portfolio-extra-skills");
    extraSkills.append(makePortfolioNode("strong", "", "Əlavə güclənən bacarıqlar:"), document.createTextNode(` ${profile.skills.slice(4).map(([label]) => s(label)).join(", ")}.`));
    detailCopy.append(extraSkills);
  }
  detail.append(detailCopy);
  portfolioCard.replaceChildren(student, journeyHeading, years, summary, skills, detail);
  portfolioCard.classList.remove("is-changing");
  if (animate && !reducedMotion) requestAnimationFrame(() => portfolioCard.classList.add("is-changing"));

  if (portfolioCounter) portfolioCounter.textContent = `${String(portfolioIndex + 1).padStart(2, "0")} / ${String(portfolioStudents.length).padStart(2, "0")}`;
  if (portfolioDots) {
    portfolioDots.replaceChildren();
    portfolioStudents.forEach((studentProfile, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `portfolio-dot${index === portfolioIndex ? " is-active" : ""}`;
      dot.setAttribute("aria-label", `${s("Şagird portfolio kartı")}: ${studentProfile.name}`);
      dot.setAttribute("aria-current", String(index === portfolioIndex));
      dot.addEventListener("click", () => { renderPortfolioCarousel(index); restartPortfolioAutoplay(); });
      portfolioDots.append(dot);
    });
  }
};

const stopPortfolioAutoplay = () => {
  if (portfolioAutoplayTimer) window.clearInterval(portfolioAutoplayTimer);
  portfolioAutoplayTimer = null;
};
const startPortfolioAutoplay = () => {
  if (reducedMotion || !portfolioCard || portfolioAutoplayTimer) return;
  portfolioAutoplayTimer = window.setInterval(() => renderPortfolioCarousel(portfolioIndex + 1), 5000);
};
const restartPortfolioAutoplay = () => { stopPortfolioAutoplay(); startPortfolioAutoplay(); };

document.querySelector("[data-portfolio-previous]")?.addEventListener("click", () => { renderPortfolioCarousel(portfolioIndex - 1); restartPortfolioAutoplay(); });
document.querySelector("[data-portfolio-next]")?.addEventListener("click", () => { renderPortfolioCarousel(portfolioIndex + 1); restartPortfolioAutoplay(); });
portfolioCard?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") { event.preventDefault(); renderPortfolioCarousel(portfolioIndex - 1); restartPortfolioAutoplay(); }
  if (event.key === "ArrowRight") { event.preventDefault(); renderPortfolioCarousel(portfolioIndex + 1); restartPortfolioAutoplay(); }
});
renderPortfolioCarousel(0, false);
const portfolioCarousel = document.querySelector(".portfolio-carousel");
portfolioCarousel?.addEventListener("mouseenter", stopPortfolioAutoplay);
portfolioCarousel?.addEventListener("mouseleave", startPortfolioAutoplay);
portfolioCarousel?.addEventListener("focusin", stopPortfolioAutoplay);
portfolioCarousel?.addEventListener("focusout", (event) => { if (!portfolioCarousel.contains(event.relatedTarget)) startPortfolioAutoplay(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) stopPortfolioAutoplay(); else startPortfolioAutoplay(); });
startPortfolioAutoplay();

const galleryFilters = [...document.querySelectorAll("[data-gallery-filter]")];
const galleryShots = [...document.querySelectorAll("[data-gallery-category]")];
galleryFilters.forEach((filter) => {
  filter.addEventListener("click", () => {
    const category = filter.dataset.galleryFilter;
    galleryFilters.forEach((item) => {
      const active = item === filter;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });
    galleryShots.forEach((shot) => { shot.hidden = category !== "all" && shot.dataset.galleryCategory !== category; });
  });
});

if (!reducedMotion) {
  galleryShots.forEach((shot) => {
    const image = shot.querySelector("img");
    shot.addEventListener("pointermove", (event) => {
      if (!image) return;
      const bounds = shot.getBoundingClientRect();
      const horizontal = ((event.clientX - bounds.left) / bounds.width - .5) * 10;
      const vertical = ((event.clientY - bounds.top) / bounds.height - .5) * 10;
      image.style.transform = `scale(1.07) translate(${horizontal}px, ${vertical}px)`;
    });
    shot.addEventListener("pointerleave", () => { if (image) image.style.transform = ""; });
  });
}

document.addEventListener("coolab:localechange", () => {
  renderCalendar?.();
  renderPortfolioCarousel(portfolioIndex, false);
  void updateLabEntryState();
});
