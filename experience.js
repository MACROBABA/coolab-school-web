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
      labelNode.textContent = label;
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
    const labels = { blue: "Mavi", yellow: "Sarı", orange: "Narıncı" };
    robotStatus.textContent = `${labels[robotState.body]} ${robotState.move === "hover" ? "uçan" : "təkərli"} kəşf robotu hazırdır.`;
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
  ideaForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const interest = byId("idea-interest").value.trim() || "sevdiyin mövzu";
    const track = byId("idea-track").value;
    const format = byId("idea-format").value;
    const ideas = {
      tech: { title: "Kəşf edən ağıllı robot", text: `“${interest}” mövzusunda kiçik robot qur. Sensorla məlumat topla, nəticəni ekranda göstər və modelini sına.` },
      design: { title: "Rəqəmsal hekayə studiyası", text: `“${interest}” haqqında üç kadrdan ibarət vizual hekayə hazırla. Rəng paletini seç, personaj yarat və işini təqdim et.` },
      social: { title: "Faydalı fikir xəritəsi", text: `“${interest}” üçün komandanla faydalı həll düşün. Problemi izah et, prototipini qur və insanlardan rəy topla.` },
    };
    const formatText = { team: "Komandada rolları bölüşdür.", solo: "İdeyanı fərdi eskizdən başlat.", camp: "Düşərgədə sınaq meydanında təqdim et." }[format];
    const result = ideas[track];
    ideaOutput.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = result.title;
    const copy = document.createElement("p");
    copy.textContent = `${result.text} ${formatText}`;
    ideaOutput.append(title, copy);
    addSkill(track === "tech" ? "tech" : track === "design" ? "creative" : "team", 5);
  });
}

const gameBoard = byId("game-board");
const gameTarget = byId("game-target");
const gameStart = byId("game-start");
let gameTimer;
let gameScore = 0;
let gameTime = 30;
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
  gameStart.addEventListener("click", () => {
    clearInterval(gameTimer);
    gameScore = 0;
    gameTime = 30;
    byId("game-score").textContent = "0";
    byId("game-time").textContent = "30";
    gameStart.textContent = "Enerjini topla!";
    gameTarget.classList.add("is-visible");
    placeTarget();
    gameTimer = window.setInterval(() => {
      gameTime -= 1;
      byId("game-time").textContent = gameTime;
      if (gameTime <= 0) {
        clearInterval(gameTimer);
        gameTimer = undefined;
        gameTarget.classList.remove("is-visible");
        gameStart.textContent = `${gameScore} xal — yenidən oyna`;
        addSkill("tech", Math.min(8, Math.ceil(gameScore / 2)));
      }
    }, 1000);
  });
}

const zoneContent = {
  robot: ["Robot lab", "Sensorlarla tanış ol, robotunun missiyasını seç və komandanla sınaq meydanına çıx."],
  art: ["Dizayn studiyası", "Poster, animasiya və rəqəmsal hekayə üçün rəng, forma və ideyaları bir araya gətir."],
  team: ["Komanda meydanı", "Sürətli oyunlar və kiçik missiyalarla liderlik, ünsiyyət və əməkdaşlığı sına."],
  nature: ["Kəşf zonası", "Təbiəti müşahidə et, suallar yarat və elmi kiçik təcrübələrlə kəşf et."],
};
document.querySelectorAll(".map-zone").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".map-zone").forEach((item) => item.classList.toggle("is-active", item === button));
    const [title, copy] = zoneContent[button.dataset.zone];
    const detail = byId("zone-detail");
    detail.replaceChildren();
    const heading = document.createElement("h4");
    heading.textContent = title;
    const paragraph = document.createElement("p");
    paragraph.textContent = copy;
    detail.append(heading, paragraph);
    addSkill(button.dataset.zone === "robot" ? "tech" : button.dataset.zone === "art" ? "creative" : "team", 3);
  });
});

const calendarData = [
  { month: "Sentyabr 2026", events: [{ day: "14", title: "Robot missiyası", info: "Sensorlar və təkərli robotlarla açıq laboratoriya." }, { day: "21", title: "Dizayn günü", info: "Poster və rəqəmsal hekayə workshopu." }, { day: "27", title: "Ailə təqdimatı", info: "Uşaqlar həftəlik layihələrini ailələrinə göstərir." }] },
  { month: "Oktyabr 2026", events: [{ day: "05", title: "Payız düşərgəsi", info: "3 günlük oyun, elm və komanda təcrübəsi." }, { day: "18", title: "Oyun laboratoriyası", info: "Öz oyun ideyanı prototipə çevir." }, { day: "30", title: "Demo axşamı", info: "Komandalar işlərini səhnədə paylaşır." }] },
  { month: "Noyabr 2026", events: [{ day: "08", title: "Kosmos həftəsi", info: "Raket modeli və ulduz xəritəsi layihəsi." }, { day: "16", title: "Liderlik oyunu", info: "Qərar vermək və komandanı dinləmək üçün missiyalar." }, { day: "28", title: "Qışa hazırlıq", info: "Yeni kamp proqramları ilə tanışlıq günü." }] },
];
let calendarIndex = 0;
const renderCalendar = () => {
  const entry = calendarData[calendarIndex];
  byId("calendar-month").textContent = entry.month;
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
    title.textContent = event.title;
    const note = document.createElement("small");
    note.textContent = "Detallara bax";
    copy.append(title, note);
    button.append(date, copy);
    button.addEventListener("click", () => {
      list.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
      byId("calendar-detail").textContent = `${event.day} — ${event.info}`;
    });
    if (index === 0) button.classList.add("is-active");
    list.append(button);
  });
  byId("calendar-detail").textContent = `${entry.events[0].day} — ${entry.events[0].info}`;
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
};
const replyToChat = (text) => {
  const normalized = text.toLocaleLowerCase("az");
  if (/(robot|kod|oyun|texnolog)/.test(normalized)) return "Robototexnika ilə başlamaq sənə uyğun görünür. Əvvəl 3D robot studiyasında hissələri sına, sonra Robot lab düşərgəsinə qoşul.";
  if (/(dizayn|rəng|şəkil|vizual)/.test(normalized)) return "Qrafik dizayn proqramında rəng, forma və hekayə ilə işləyəcəksən. AI ideya generatorunda bir mövzu yazıb ilk layihəni seçə bilərsən.";
  if (/(düşərgə|kamp|yay)/.test(normalized)) return "Düşərgədə hər gün fərqli missiya, komanda oyunu və yaradıcı layihə var. Xəritədən Kəşf zonası və Komanda meydanına bax.";
  if (/(13|14|15|16|17)/.test(normalized)) return "Bu yaş üçün layihə əsaslı robototexnika, dizayn və oyun laboratoriyası yaxşı başlanğıcdır. Hansı mövzunu daha çox sevdiyini yaz, onu dəqiqləşdirək.";
  return "Sənin marağın əsasında yaxşı başlanğıc taparıq. Robot, dizayn, oyun, düşərgə və ya təqdimat mövzularından birini yaz.";
};
const sendChat = (text) => {
  const messageText = text.trim();
  if (!messageText) return;
  addChatMessage(messageText, "user");
  window.setTimeout(() => addChatMessage(replyToChat(messageText)), 280);
};
byId("chat-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = byId("chat-input");
  sendChat(input.value);
  input.value = "";
});
document.querySelectorAll(".quick-prompt").forEach((button) => button.addEventListener("click", () => sendChat(button.textContent)));

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
  if (!navigator.mediaDevices?.getUserMedia) {
    arStatus.textContent = "Bu brauzerdə kamera funksiyası əlçatan deyil.";
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
    arStatus.textContent = "AR səhnəsi aktivdir — robot görüntünün üzərindədir.";
    addSkill("tech", 4);
  } catch {
    arStatus.textContent = "Kamera açılmadı. İcazəni yoxla və yenidən cəhd et.";
  }
});
byId("ar-stop")?.addEventListener("click", () => {
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = undefined;
  arRunning = false;
  if (arVideo) arVideo.srcObject = null;
  byId("ar-placeholder")?.classList.remove("is-hidden");
  arStatus.textContent = "Kamera bağlandı.";
});

const portfolioProfiles = {
  explorer: {
    name: "Kəşf edən şagird",
    years: [["2024", "Maraq və uyğunlaşma"], ["2025", "İlk layihə və komanda işi"], ["2026", "Təqdimat və yeni hədəflər"]],
    summary: "Robototexnika ilə başlayan maraq, layihə qurmaq və fikrini təqdim etmək bacarığına çevrilib.",
    skills: [["Texnologiya", "78%"], ["Komanda işi", "82%"], ["Özünüifadə", "74%"]],
  },
  creator: {
    name: "Yaradan şagird",
    years: [["2024", "Rəng və forma ilə tanışlıq"], ["2025", "İlk dizayn portfolioları"], ["2026", "Vizual hekayə və təqdimat"]],
    summary: "Sadə eskizlərdən başlayaraq ideyanı rəng, kompozisiya və vizual hekayə ilə ifadə etmə bacarığı formalaşıb.",
    skills: [["Yaradıcılıq", "86%"], ["Dizayn düşüncəsi", "79%"], ["Təqdimat", "76%"]],
  },
  leader: {
    name: "Komanda lideri",
    years: [["2024", "Qrup fəaliyyətlərinə qoşulma"], ["2025", "Missiyalarda rol alma"], ["2026", "Komandanı yönləndirmə"]],
    summary: "Komanda oyunları və düşərgə missiyaları ilə ünsiyyət, məsuliyyət və liderlik bacarıqları güclənib.",
    skills: [["Komanda işi", "91%"], ["Liderlik", "83%"], ["Ünsiyyət", "88%"]],
  },
};

const renderPortfolio = (profileKey) => {
  const profile = portfolioProfiles[profileKey];
  if (!profile) return;
  byId("portfolio-name").textContent = profile.name;
  byId("portfolio-range").textContent = "2024 → 2026";
  byId("portfolio-summary").textContent = profile.summary;
  const years = byId("portfolio-years");
  const skills = byId("portfolio-skills");
  years.replaceChildren();
  skills.replaceChildren();
  profile.years.forEach(([year, label]) => {
    const node = document.createElement("div");
    node.className = "portfolio-year";
    const title = document.createElement("strong");
    title.textContent = year;
    const copy = document.createTextNode(label);
    node.append(title, copy);
    years.append(node);
  });
  profile.skills.forEach(([label, value]) => {
    const node = document.createElement("div");
    node.className = "portfolio-skill";
    const title = document.createTextNode(label);
    const score = document.createElement("b");
    score.textContent = value;
    node.append(title, score);
    skills.append(node);
  });
};

document.querySelectorAll("[data-portfolio-profile]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-portfolio-profile]").forEach((item) => item.classList.toggle("is-active", item === button));
    renderPortfolio(button.dataset.portfolioProfile);
  });
});
