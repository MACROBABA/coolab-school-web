const storageKey = "coolab.auth";
const root = document.querySelector("#portal-root");
let activeUser = null;
let adminSection = "overview";
const source = (value) => window.CoolabI18n?.source?.(value) ?? value;
const apiBase = window.CoolabApiUrl
  ?? (window.location.port === "7103"
    ? `${window.location.origin}/api/v1`
    : "https://localhost:7103/api/v1");

const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const apiWakeupPreview = new URLSearchParams(window.location.search).has("api-wakeup-preview");
const sleepingApi = apiWakeupPreview || !/(localhost|127\.0\.0\.1)/i.test(apiBase);
const apiWakeup = { pending: 0, revealTimer: null, messageTimer: null, startedAt: 0, overlay: null };

const getWakeupOverlay = () => {
  if (apiWakeup.overlay) return apiWakeup.overlay;
  const overlay = document.createElement("div");
  overlay.className = "api-wakeup"; overlay.hidden = true; overlay.setAttribute("role", "status"); overlay.setAttribute("aria-live", "polite");
  overlay.innerHTML = `<div class="api-wakeup-card"><div class="api-wakeup-orbit"><i></i><b>C</b></div><span class="api-wakeup-kicker">COOLAB SİSTEMİ</span><h2>Şəxsi kabinetiniz hazırlanır</h2><p data-wakeup-copy>Təhlükəsiz bağlantı qurulur. Bu, bir neçə saniyə çəkə bilər.</p><div class="api-wakeup-track"><span></span></div><small data-wakeup-time>Sistemə qoşulursunuz…</small></div>`;
  document.body.append(overlay); apiWakeup.overlay = overlay; return overlay;
};

const updateWakeupCopy = () => {
  const elapsed = Math.floor((Date.now() - apiWakeup.startedAt) / 1000);
  const overlay = getWakeupOverlay();
  const copy = overlay.querySelector("[data-wakeup-copy]"); const time = overlay.querySelector("[data-wakeup-time]");
  if (elapsed >= 28) { copy.textContent = "Bağlantı hazırlanır. Zəhmət olmasa səhifəni bağlamayın."; time.textContent = `${elapsed} saniyə gözlənilir`; }
  else if (elapsed >= 10) { copy.textContent = "Məlumatlarınız təhlükəsiz şəkildə yüklənir."; time.textContent = "Bir az da gözləyin…"; }
};

const beginApiWakeup = () => {
  if (!sleepingApi) return;
  apiWakeup.pending += 1;
  if (apiWakeup.pending !== 1) return;
  apiWakeup.startedAt = Date.now();
  apiWakeup.revealTimer = window.setTimeout(() => { const overlay = getWakeupOverlay(); overlay.hidden = false; overlay.classList.add("is-visible"); updateWakeupCopy(); apiWakeup.messageTimer = window.setInterval(updateWakeupCopy, 1000); }, 900);
};

const endApiWakeup = () => {
  if (!sleepingApi) return;
  apiWakeup.pending = Math.max(0, apiWakeup.pending - 1);
  if (apiWakeup.pending) return;
  window.clearTimeout(apiWakeup.revealTimer); window.clearInterval(apiWakeup.messageTimer);
  if (apiWakeup.overlay) { apiWakeup.overlay.classList.remove("is-visible"); apiWakeup.overlay.hidden = true; }
};

const fetchWithWakeup = async (url, options) => {
  const retryDelays = [2000, 3500, 5500, 8000, 11000, 14000, 17000];
  let lastError;
  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!sleepingApi || ![502, 503, 504].includes(response.status) || attempt === retryDelays.length) return response;
      await delay(retryDelays[attempt]);
    } catch (error) {
      lastError = error;
      if (!sleepingApi || attempt === retryDelays.length) throw error;
      await delay(retryDelays[attempt]);
    }
  }
  throw lastError ?? new Error("Bağlantı qurula bilmədi.");
};
if (apiWakeupPreview) {
  window.setTimeout(() => { beginApiWakeup(); window.setTimeout(endApiWakeup, 10000); }, 180);
}
const readSession = () => {
  try { return JSON.parse(localStorage.getItem(storageKey) ?? "null"); }
  catch { localStorage.removeItem(storageKey); return null; }
};

const text = (tag, value, className = "") => {
  const element = document.createElement(tag);
  element.textContent = value ?? "";
  if (className) element.className = className;
  return element;
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat(({ az: "az-AZ", en: "en-GB", ru: "ru-RU" })[window.CoolabI18n?.locale] ?? "az-AZ", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
  : "Tarix təyin edilməyib";

const statusTone = (status = "") => {
  const value = status.toLowerCase();
  if (value.includes("pending") || value.includes("submitted")) return "yellow";
  if (value.includes("rejected") || value.includes("suspended")) return "red";
  if (value.includes("draft")) return "orange";
  return "";
};

const displayStatus = (status = "") => ({
  submitted: "Gözləyir", underReview: "Baxılır", approved: "Təsdiqlənib", rejected: "Rədd edilib",
  active: "Aktiv", pendingApproval: "Gözləyir", pendingParentApproval: "Valideyn təsdiqi",
  pendingPayment: "Ödəniş gözləyir", published: "Yayımlanıb", draft: "Qaralama", scheduled: "Planlanıb",
}[status] ?? status);

const api = async (path, options = {}) => {
  const session = readSession();
  if (!session?.accessToken) throw new Error("Sessiya tapılmadı.");
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (options.body) headers.set("Content-Type", "application/json");
  beginApiWakeup();
  let response;
  try { response = await fetchWithWakeup(`${apiBase}${path}`, { ...options, headers }); } finally { endApiWakeup(); }
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    if (response.status === 401) {
      localStorage.removeItem(storageKey);
      window.location.replace("index.html");
    }
    throw new Error(problem?.detail || problem?.title || "Sorğu tamamlanmadı.");
  }
  return response.status === 204 ? null : response.json();
};

const panel = (title, copy, label = "") => {
  const section = document.createElement("section");
  section.className = "panel";
  const head = document.createElement("div");
  head.className = "panel-head";
  const titleWrap = document.createElement("div");
  titleWrap.append(text("h2", title));
  if (copy) titleWrap.append(text("p", copy));
  head.append(titleWrap);
  if (label) head.append(text("span", label, "tag"));
  section.append(head);
  return section;
};

const setMessage = (node, message, type = "") => {
  node.textContent = message;
  node.className = `message${type ? ` ${type}` : ""}`;
};

const createHero = (user, eyebrow, title, copy) => {
  const hero = document.createElement("section");
  hero.className = "hero";
  hero.append(text("span", eyebrow, "eyebrow"), text("h1", title), text("p", copy));
  return hero;
};

const createSummary = (items) => {
  const list = document.createElement("section");
  list.className = "summary";
  items.forEach(({ label, value }) => {
    const stat = document.createElement("article");
    stat.className = "stat";
    stat.append(text("span", label), text("strong", value));
    list.append(stat);
  });
  return list;
};

const mountWorkspace = (user, role, items, activeTarget = "overview") => {
  const hashTarget = window.location.hash.replace(/^#/, "");
  if (items.some((item) => item.target === hashTarget && !item.action)) activeTarget = hashTarget;
  const content = document.createElement("main");
  content.className = "workspace-content";
  while (root.firstChild) content.append(root.firstChild);
  content.querySelectorAll(".panel[id]").forEach((section) => section.classList.add("workspace-section"));
  const shell = document.createElement("div"); shell.className = "workspace-shell";
  const sidebar = document.createElement("aside"); sidebar.className = "workspace-sidebar";
  const brand = document.createElement("a"); brand.className = "workspace-brand"; brand.href = "index.html";
  const hubLabel = role === "mentor" ? "MENTOR" : role === "admin" ? "ADMIN" : "STUDENT";
  brand.innerHTML = `<span class="workspace-mark">C</span><span>COOLAB<br /><small>${hubLabel} HUB</small></span>`;
  const name = text("div", `${user.firstName} ${user.lastName}`, "workspace-user");
  const navigation = document.createElement("nav"); navigation.className = "workspace-nav";
  const activate = (target) => {
    const isOverview = target === "overview";
    content.querySelectorAll(".hero, .summary").forEach((element) => { element.hidden = !isOverview; });
    content.querySelectorAll(".dashboard-grid").forEach((grid) => { grid.hidden = !isOverview; });
    content.querySelectorAll(".workspace-section").forEach((section) => { section.hidden = !isOverview && section.id !== target; });
    navigation.querySelectorAll(".workspace-nav-item").forEach((node) => node.classList.toggle("is-active", node.dataset.target === target));
    if (!isOverview) window.history.replaceState(null, "", `#${target}`);
    else window.history.replaceState(null, "", window.location.pathname + window.location.search);
  };
  items.forEach((item) => {
    if (item.group) navigation.append(text("span", item.label, "workspace-nav-group"));
    else {
      const button = text("button", item.label, `workspace-nav-item${item.target === activeTarget ? " is-active" : ""}`); button.type = "button"; button.dataset.target = item.target;
      button.addEventListener("click", () => {
        if (item.action) { item.action(); return; }
        activate(item.target);
      });
      navigation.append(button);
    }
  });
  const exit = text("a", "← Ana səhifəyə qayıt", "workspace-exit"); exit.href = "index.html";
  sidebar.append(brand, name, navigation, exit); shell.append(sidebar, content); root.append(shell);
  if (items.some((item) => item.target === activeTarget && !item.action)) activate(activeTarget);
};

const createItem = (titleValue, detail, tagValue, tagStatus = "") => {
  const item = document.createElement("article");
  item.className = "item";
  const copy = document.createElement("div");
  copy.append(text("strong", titleValue), text("span", detail));
  item.append(copy);
  if (tagValue) item.append(text("span", tagValue, `badge ${tagStatus}`));
  return item;
};

const studentLabCopy = () => ({
  az: {
    title: "Coolab Lab", description: "Gündəlik laboratoriya vaxtınla robot studiyasını, AR təcrübəsini və oyunlarını balanslı şəkildə kəşf et.",
    minutesLeft: (value) => `${value} dəq qalıb`, done: "Bu gün tamamlandı", usage: "Bu gün istifadə etdiyin Coolab Lab vaxtı.",
    energy: "Enerji toplama", energyCopy: "30 saniyəlik oyunla refleksini sına və xallarını kabinetində topla.",
    robot: "3D robot studiyası", robotCopy: "Robotunun hissələrini seç, səhnəni araşdır və fikrini dəyişdir.",
    ar: "AR laboratoriyası", arCopy: "Robotu kamera görüntüsündə gör və təcrübəni təhlükəsiz şəkildə bağla.", open: "Aç →",
  },
  en: {
    title: "Coolab Lab", description: "Use your daily lab time to explore Robot Studio, AR experiences and games in a balanced way.",
    minutesLeft: (value) => `${value} min left`, done: "Complete for today", usage: "Coolab Lab time you used today.",
    energy: "Collect energy", energyCopy: "Try your reflexes in a 30-second game and collect your points in the dashboard.",
    robot: "3D Robot Studio", robotCopy: "Choose your robot's parts, explore the scene and adapt your idea.",
    ar: "AR laboratory", arCopy: "See the robot through your camera and close the experience safely.", open: "Open →",
  },
  ru: {
    title: "Coolab Lab", description: "Используйте ежедневное время лаборатории, чтобы сбалансированно изучать Студию робота, AR-опыты и игры.",
    minutesLeft: (value) => `осталось ${value} мин`, done: "На сегодня завершено", usage: "Время Coolab Lab, использованное сегодня.",
    energy: "Сбор энергии", energyCopy: "Проверь реакцию в 30-секундной игре и сохраняй очки в кабинете.",
    robot: "3D Студия робота", robotCopy: "Выбирай детали робота, исследуй сцену и меняй свою идею.",
    ar: "AR-лаборатория", arCopy: "Посмотри на робота через камеру и безопасно заверши опыт.", open: "Открыть →",
  },
}[window.CoolabI18n?.locale ?? "az"]);

const createStudentIdeaGenerator = (enrollments) => {
  const activeCourses = [...new Map((enrollments ?? [])
    .filter((item) => item.status === "active")
    .map((item) => [item.courseTitle, item])).values()];
  const panelNode = panel("Layihə ideya generatoru", "Öz proqramına uyğun, dərsdə və portfolio-da inkişaf etdirə biləcəyin başlanğıc planı yarat.", "Yeni ideya");
  panelNode.id = "student-ideas";
  panelNode.classList.add("wide", "student-idea-panel");

  const layout = document.createElement("div"); layout.className = "student-idea-layout";
  const intro = document.createElement("aside"); intro.className = "student-idea-intro";
  intro.innerHTML = `<p class="eyebrow">COOLAB LAYİHƏ STUDİYASI</p><h3>Fikrini ilk prototipə çevir</h3><p>Seçdiyin proqram, mövzu və iş formatına əsasən sənə aydın üç addımlı başlanğıc planı verəcəyik.</p>`;
  const form = document.createElement("form"); form.className = "student-idea-form";
  form.innerHTML = `<label>Maraqlandığın mövzu<input name="interest" maxlength="46" value="gələcək şəhər" placeholder="Məsələn: kosmos, oyun, təbiət" /></label><label>Proqram<select name="course"></select></label><label>Format<select name="format"><option value="team">Komanda ilə</option><option value="solo">Fərdi</option><option value="lesson">Dərs üçün</option></select></label><button type="submit">Mənə plan yarat ✦</button>`;
  const courseSelect = form.elements.course;
  const recommendedCourses = activeCourses.length ? activeCourses : [
    { courseTitle:"Robototexnika" }, { courseTitle:"Qrafik dizayn" }, { courseTitle:"Süni intellekt" }, { courseTitle:"Proqramlaşdırma" },
  ];
  recommendedCourses.forEach((course) => courseSelect.append(new Option(course.courseTitle, course.courseTitle)));
  const result = document.createElement("div"); result.className = "student-idea-result"; result.setAttribute("aria-live", "polite");
  const ideas = {
    robototexnika: { title:(topic) => `“${topic}” üçün ağıllı maket`, copy:(topic) => `Sensor və LED-lərlə “${topic}” mövzusunda işləyən kiçik bir sistem qur.`, steps:["Nəyin ölçüləcəyini seç.", "Maket və dövrəni qur.", "Sınaq nəticəsini izah et."] },
    "qrafik dizayn": { title:(topic) => `“${topic}” üçün vizual kampaniya`, copy:(topic) => `“${topic}” mesajını poster, rəng palitrası və sosial media vizualı ilə təqdim et.`, steps:["Mesajı və auditoriyanı seç.", "Eskiz və palitra hazırla.", "İşini təqdim edib rəy topla."] },
    "süni intellekt": { title:(topic) => `“${topic}” üçün AI araşdırması`, copy:(topic) => `“${topic}” mövzusunda etibarlı məlumatları AI cavabları ilə müqayisə edib nəticəni təqdim et.`, steps:["Araşdırma sualını yaz.", "Sorğuları və mənbələri yoxla.", "Nəticəni infoqrafikaya çevir."] },
    proqramlaşdırma: { title:(topic) => `“${topic}” üçün mini tətbiq`, copy:(topic) => `“${topic}” problemi üçün sadə, faydalı və interaktiv veb səhifə və ya oyun yarad.`, steps:["Əsas funksiyanı seç.", "İlk ekranı və kodu qur.", "Dostunla test edib düzəlt."] },
  };
  const showResult = () => {
    const interest = String(form.elements.interest.value || "gələcək şəhər").trim();
    const course = String(courseSelect.value || "Robototexnika");
    const format = form.elements.format.value;
    const key = course.toLocaleLowerCase("az-AZ");
    const idea = ideas[key] ?? ideas.robototexnika;
    const formatLabel = ({ team:"Komanda ilə", solo:"Fərdi", lesson:"Dərs üçün" })[format];
    result.replaceChildren();
    const tags = document.createElement("div"); tags.className = "student-idea-tags";
    [course, formatLabel, "3 addım"].forEach((value) => tags.append(text("span", value)));
    const title = text("strong", idea.title(interest));
    const copy = text("p", `${idea.copy(interest)} ${format === "team" ? "Komandada rolları bölüşdürməyi unutma." : format === "solo" ? "İlk eskizi mentorunla bölüşə bilərsən." : "Növbəti dərsdə mentorunla sınaqdan keçir."}`);
    const steps = document.createElement("div"); steps.className = "student-idea-steps";
    ["Planla", "Hazırla", "Təqdim et"].forEach((label, index) => { const step = document.createElement("div"); step.className = "student-idea-step"; step.append(text("b", `${index + 1}. ${label}`), document.createTextNode(idea.steps[index])); steps.append(step); });
    result.append(tags, title, copy, steps);
  };
  form.addEventListener("submit", (event) => { event.preventDefault(); showResult(); });
  showResult();
  layout.append(intro, form); form.append(result); panelNode.append(layout);
  return panelNode;
};

const renderStudent = async (user) => {
  const [data, labAllowance] = await Promise.all([api("/student/dashboard"), api("/student/lab/allowance")]);
  const portfolio = data.portfolio ?? { progressPercent: 0, milestones: [], projects: [] };
  root.replaceChildren(
    createHero(user, "Şagird kabineti", `Salam, ${data.displayName}!`, "Dərslərini, oyun nəticələrini və inkişaf yolunu buradan izləyə bilərsən."),
    createSummary([
      { label: "Aktiv proqram", value: String(data.enrollments.filter((item) => item.status === "active").length) },
      { label: "Oyun xalın", value: String(data.games.reduce((total, item) => total + item.totalPoints, 0)) },
      { label: "Yeni dərslər", value: String(data.lessons.length) },
    ]),
  );
  const grid = document.createElement("div");
  grid.className = "dashboard-grid";
  const journeyPanel = panel("Təhsil xəritən", "Kurslarını, yaxın addımlarını və əsas fəaliyyətlərini bir baxışda idarə et.", `${data.enrollments?.length ?? 0} aktiv qrup`);
  journeyPanel.id = "student-journey";
  journeyPanel.classList.add("wide", "student-journey-panel");
  const journeyLayout = document.createElement("div"); journeyLayout.className = "student-journey-layout";
  const courseRail = document.createElement("div"); courseRail.className = "student-course-rail";
  const activeEnrollments = (data.enrollments ?? []).filter((item) => item.status === "active");
  if (!activeEnrollments.length) courseRail.append(text("div", "Aktiv qrupun təyin ediləndə dərs xəritən burada görünəcək.", "empty"));
  activeEnrollments.forEach((enrollment, index) => {
    const course = document.createElement("article"); course.className = "student-course-card"; course.dataset.course = String(index % 4);
    const latestLesson = (data.lessons ?? []).find((lesson) => lesson.groupName === enrollment.groupName);
    const top = document.createElement("div"); top.className = "student-course-top";
    const badge = text("span", "Aktiv təhsil", "student-course-kicker");
    const count = text("span", String((data.lessons ?? []).filter((lesson) => lesson.groupName === enrollment.groupName).length), "student-course-count");
    top.append(badge, count);
    course.append(top, text("h3", enrollment.courseTitle), text("p", enrollment.groupName + (enrollment.scheduleNote ? ` · ${enrollment.scheduleNote}` : "")));
    course.append(text("span", latestLesson ? `Son paylaşım: ${latestLesson.title}` : "Mentorun yeni paylaşımını gözlə", "student-course-update"));
    courseRail.append(course);
  });
  const actionRail = document.createElement("div"); actionRail.className = "student-action-rail";
  [
    ["Dərslərə bax", "Yeni material və tapşırıqları aç", "student-materials"],
    ["Nəticələrim", "Qiymət və davamiyyətini izlə", "student-rating"],
    ["Coolab Lab", `${Math.ceil(labAllowance.remainingSeconds / 60)} dəqiqə vaxtın qalıb`, "student-lab"],
  ].forEach(([titleValue, detail, target]) => {
    const button = document.createElement("button"); button.type = "button"; button.className = "student-quick-action";
    button.append(text("b", titleValue), text("span", detail), text("em", "Aç →"));
    button.addEventListener("click", () => document.querySelector(`.workspace-nav-item[data-target=\"${target}\"]`)?.click());
    actionRail.append(button);
  });
  journeyLayout.append(courseRail, actionRail); journeyPanel.append(journeyLayout);
  const lessons = panel("Dərslərim", "Mentorun paylaşdığı materiallara bax və tapşırıqları izlə.", `${data.lessons.length} dərs`);
  lessons.id = "student-materials";
  const lessonsList = document.createElement("div");
  lessonsList.className = "cards";
  if (!data.lessons.length) lessonsList.append(text("div", "Hələ yayımlanmış dərs yoxdur.", "empty"));
  data.lessons.forEach((lesson) => {
    const card = document.createElement("article"); card.className = "lesson";
    card.append(text("h3", lesson.title), text("p", `${lesson.courseTitle} · ${lesson.groupName} · ${formatDate(lesson.publishAt)}`));
    if (lesson.body) card.append(text("p", lesson.body));
    lesson.materials.forEach((material) => {
      const target = material.contentOrUrl;
      if (target && /^https?:\/\//i.test(target)) {
        const link = text("a", `${material.title} ↗`, "material"); link.href = target; link.target = "_blank"; link.rel = "noopener noreferrer"; card.append(link);
      } else card.append(text("span", material.title, "material"));
    });
    lessonsList.append(card);
  });
  lessons.append(lessonsList);
  const ideaPanel = createStudentIdeaGenerator(data.enrollments);
  const gamePanel = panel("Oyun nəticələrim", "Ana səhifədə “Enerji toplama” oyununu oynadıqca ən yaxşı nəticən burada görünəcək.");
  gamePanel.id = "student-games";
  const games = document.createElement("div"); games.className = "cards";
  if (!data.games.length) games.append(text("div", "Hələ oyun nəticəsi yoxdur. Ana səhifədə oyuna başla!", "empty"));
  data.games.forEach((game) => games.append(createItem(game.gameTitle, `Səviyyə ${game.level} · Son yenilənmə: ${formatDate(game.updatedAt)}`, `${game.totalPoints} xal`)));
  gamePanel.append(games);
  const labCopy = studentLabCopy();
  const labPanel = panel(
    labCopy.title,
    labCopy.description,
    labAllowance.remainingSeconds > 0 ? labCopy.minutesLeft(Math.ceil(labAllowance.remainingSeconds / 60)) : labCopy.done,
  );
  labPanel.id = "student-lab";
  labPanel.classList.add("wide", "lab-dashboard-panel");
  const labSummary = document.createElement("div"); labSummary.className = "lab-dashboard-summary";
  const minutesUsed = Math.floor(labAllowance.usedSeconds / 60);
  const minutesLimit = Math.floor(labAllowance.dailyLimitSeconds / 60);
  const usage = document.createElement("div"); usage.className = "lab-usage";
  usage.append(text("strong", `${minutesUsed}/${minutesLimit} ${labCopy.minute ?? (window.CoolabI18n?.locale === "ru" ? "мин" : window.CoolabI18n?.locale === "en" ? "min" : "dəqiqə")}`), text("p", labCopy.usage));
  const labMeter = document.createElement("div"); labMeter.className = "growth-meter"; labMeter.setAttribute("role", "progressbar"); labMeter.setAttribute("aria-valuemin", "0"); labMeter.setAttribute("aria-valuemax", String(labAllowance.dailyLimitSeconds)); labMeter.setAttribute("aria-valuenow", String(labAllowance.usedSeconds));
  const labMeterFill = document.createElement("span"); labMeterFill.style.width = `${Math.min(100, Math.round((labAllowance.usedSeconds / labAllowance.dailyLimitSeconds) * 100))}%`; labMeter.append(labMeterFill); usage.append(labMeter);
  const labList = document.createElement("div"); labList.className = "lab-dashboard-list";
  [
    [labCopy.energy, labCopy.energyCopy, "#mini-game"],
    [labCopy.robot, labCopy.robotCopy, "#robot-builder"],
    [labCopy.ar, labCopy.arCopy, "#ar-lab"],
  ].forEach(([titleValue, detail, anchor]) => {
    const link = document.createElement("a"); link.className = "lab-dashboard-link"; link.href = `index.html${anchor}`;
    link.append(text("strong", titleValue), text("span", detail), text("b", labCopy.open)); labList.append(link);
  });
  labSummary.append(usage, labList); labPanel.append(labSummary);
  const portfolioPanel = panel("Portfolio və inkişaf", "Layihələrini topla, inkişaf mərhələlərini gör və işlərini paylaşmağa hazır saxla.", `${portfolio.progressPercent}%`);
  portfolioPanel.id = "student-portfolio";
  portfolioPanel.classList.add("wide");
  const portfolioLayout = document.createElement("div"); portfolioLayout.className = "portfolio-layout";
  const portfolioOverview = document.createElement("div"); portfolioOverview.className = "portfolio-overview";
  const meter = document.createElement("div"); meter.className = "growth-meter";
  meter.setAttribute("role", "progressbar"); meter.setAttribute("aria-valuemin", "0"); meter.setAttribute("aria-valuemax", "100"); meter.setAttribute("aria-valuenow", String(portfolio.progressPercent));
  const meterFill = document.createElement("span"); meterFill.style.width = `${portfolio.progressPercent}%`; meter.append(meterFill);
  portfolioOverview.append(text("strong", `${portfolio.progressPercent}%`), text("p", "Kabinet fəaliyyəti üzrə inkişaf göstəricisi."), meter);
  const milestones = document.createElement("div"); milestones.className = "milestone-list";
  portfolio.milestones.forEach((milestone) => {
    const item = document.createElement("article"); item.className = `milestone${milestone.isComplete ? " is-complete" : ""}`;
    item.append(text("strong", milestone.title), text("span", milestone.description));
    if (milestone.date) item.append(text("time", formatDate(milestone.date)));
    milestones.append(item);
  });
  if (!portfolio.milestones.length) milestones.append(text("div", "İnkişaf mərhələləri tezliklə burada görünəcək.", "empty"));
  portfolioOverview.append(text("h3", "İnkişaf yolun"), milestones);
  const projectArea = document.createElement("div"); projectArea.className = "portfolio-projects";
  projectArea.append(text("h3", "Layihələrim"));
  const projectList = document.createElement("div"); projectList.className = "project-list";
  if (!portfolio.projects.length) projectList.append(text("div", "Hələ portfolio layihəsi yoxdur. İlk işini əlavə et!", "empty"));
  portfolio.projects.forEach((project) => {
    const card = document.createElement("article"); card.className = "project-card";
    const top = document.createElement("div"); top.className = "project-card-top"; top.append(text("span", project.category, "tag"), text("time", formatDate(project.updatedAt)));
    card.append(top, text("h4", project.title), text("p", project.description));
    const actions = document.createElement("div"); actions.className = "actions";
    if (project.projectUrl && /^https?:\/\//i.test(project.projectUrl)) { const link = text("a", "Layihəyə bax ↗", "material"); link.href = project.projectUrl; link.target = "_blank"; link.rel = "noopener noreferrer"; actions.append(link); }
    const edit = text("button", "Düzəliş et", "secondary"); edit.type = "button";
    edit.addEventListener("click", () => { const form = document.querySelector("#portfolio-form"); if (!form) return; form.dataset.id = project.id; form.elements.title.value = project.title; form.elements.category.value = project.category; form.elements.description.value = project.description; form.elements.projectUrl.value = project.projectUrl ?? ""; form.elements.isFeatured.checked = project.isFeatured; form.scrollIntoView({ behavior:"smooth", block:"center" }); });
    const remove = text("button", "Sil", "danger"); remove.type = "button";
    remove.addEventListener("click", async () => { if (!window.confirm(source("Bu layihə portfolio-dan silinsin?"))) return; await api(`/student/dashboard/portfolio-projects/${project.id}`, { method:"DELETE" }); await renderPortal(user); });
    actions.append(edit, remove); card.append(actions); projectList.append(card);
  });
  projectArea.append(projectList);
  const projectForm = document.createElement("form"); projectForm.className = "form portfolio-form"; projectForm.id = "portfolio-form";
  projectForm.innerHTML = `<h3>Portfolioya layihə əlavə et</h3><label>Layihənin adı<input name="title" maxlength="160" required placeholder="Məsələn, Ağıllı şəhər maketi" /></label><label>Kateqoriya<input name="category" maxlength="80" required value="Layihə" placeholder="Robototexnika, dizayn, oyun" /></label><label>Qısa izah<textarea name="description" maxlength="3000" required placeholder="Nə yaratdığını və necə işlədiyini qısa izah et."></textarea></label><label>Layihə linki <small>(istəyə bağlı)</small><input name="projectUrl" type="url" maxlength="500" placeholder="https://..." /></label><label class="check"><input name="isFeatured" type="checkbox" /> Seçilmiş iş kimi göstər</label><button class="primary" type="submit">Portfolioya əlavə et</button><p class="message"></p></form>`;
  projectForm.addEventListener("submit", async (event) => { event.preventDefault(); const form = event.currentTarget; const button = form.querySelector("button"); const message = form.querySelector(".message"); const values = new FormData(form); const body = { title:values.get("title"), category:values.get("category"), description:values.get("description"), projectUrl:values.get("projectUrl") || null, isFeatured:values.get("isFeatured") === "on" }; button.disabled = true; try { await api(form.dataset.id ? `/student/dashboard/portfolio-projects/${form.dataset.id}` : "/student/dashboard/portfolio-projects", { method:form.dataset.id ? "PUT" : "POST", body:JSON.stringify(body) }); form.dataset.id = ""; form.reset(); form.elements.category.value = "Layihə"; setMessage(message, "Portfolio yeniləndi.", "success"); await renderPortal(user); } catch (error) { setMessage(message, error.message, "error"); } finally { button.disabled = false; } });
  portfolioLayout.append(portfolioOverview, projectArea, projectForm); portfolioPanel.append(portfolioLayout);
  const programPanel = panel("Proqramlarım", "Qoşulduğun qruplar və dərs vaxtları.");
  programPanel.id = "student-schedule";
  const programs = document.createElement("div"); programs.className = "cards";
  if (!data.enrollments.length) programs.append(text("div", "Hələ proqram təyin edilməyib.", "empty"));
  data.enrollments.forEach((enrollment) => programs.append(createItem(enrollment.courseTitle, `${enrollment.groupName}${enrollment.scheduleNote ? ` · ${enrollment.scheduleNote}` : ""}`, displayStatus(enrollment.status), statusTone(enrollment.status))));
  programPanel.append(programs);
  const ratingPanel = panel("Tapşırıq və rating", "Mentorun tapşırıqlara verdiyi bal və rəy burada görünür.", `${data.assignments?.length ?? 0} tapşırıq`);
  ratingPanel.id = "student-rating";
  const ratingList = document.createElement("div"); ratingList.className = "cards";
  if (!data.assignments?.length) ratingList.append(text("div", "Hələ qiymətləndiriləcək tapşırıq yoxdur.", "empty"));
  (data.assignments ?? []).forEach((assignment) => ratingList.append(createItem(
    assignment.title,
    `${assignment.courseTitle} · ${assignment.groupName}${assignment.dueAt ? ` · Son tarix: ${formatDate(assignment.dueAt)}` : ""}${assignment.mentorFeedback ? ` · Rəy: ${assignment.mentorFeedback}` : ""}`,
    assignment.score == null ? `Maks. ${assignment.maxScore}` : `${assignment.score}/${assignment.maxScore}`,
    assignment.score == null ? "yellow" : "")));
  ratingPanel.append(ratingList);
  const attendancePanel = panel("Davamiyyət", "Dərslərdə iştirak göstəricin və son qeydlər.", `%${data.attendance?.ratePercent ?? 0}`);
  attendancePanel.id = "student-attendance";
  const attendanceList = document.createElement("div"); attendanceList.className = "cards";
  if (!data.attendance?.recentRecords?.length) attendanceList.append(text("div", "Hələ davamiyyət qeydi yoxdur.", "empty"));
  (data.attendance?.recentRecords ?? []).forEach((record) => attendanceList.append(createItem(`${record.courseTitle} · ${record.groupName}`, `${formatDate(record.attendanceDate)}${record.note ? ` · ${record.note}` : ""}`, displayStatus(record.status), statusTone(record.status))));
  attendancePanel.append(attendanceList);
  const reviewPanel = panel("Təlim rəyi", "Mentorun inkişafınla bağlı qeydləri.", `${data.trainingReviews?.length ?? 0} rəy`);
  reviewPanel.id = "student-reviews";
  const reviewList = document.createElement("div"); reviewList.className = "cards";
  if (!data.trainingReviews?.length) reviewList.append(text("div", "Mentor rəyi hələ əlavə edilməyib.", "empty"));
  (data.trainingReviews ?? []).forEach((review) => reviewList.append(createItem(review.title || "Mentor rəyi", `${review.body} · ${review.mentorName} · ${formatDate(review.createdAt)}`, review.courseTitle)));
  reviewPanel.append(reviewList);
  const requestPanel = panel("Təklif və şikayət", "Fikrini Coolab komandası ilə bölüş. Cavablar və müraciətin statusu burada görünəcək.", `${data.requests?.length ?? 0} müraciət`);
  requestPanel.id = "student-feedback";
  const requestList = document.createElement("div"); requestList.className = "cards";
  if (!data.requests?.length) requestList.append(text("div", "Hələ təklif və ya şikayət göndərməmisən.", "empty"));
  (data.requests ?? []).forEach((request) => {
    const detail = `${request.type === "complaint" ? "Şikayət" : "Təklif"} · ${request.body}${request.adminReply ? ` · Admin cavabı: ${request.adminReply}` : ""}`;
    requestList.append(createItem(request.subject, detail, displayStatus(request.status), statusTone(request.status)));
  });
  const requestForm = document.createElement("form"); requestForm.className = "form";
  requestForm.innerHTML = `<label>Növ<select name="type"><option value="suggestion">Təklif</option><option value="complaint">Şikayət</option></select></label><label>Mövzu<input name="subject" maxlength="180" required placeholder="Qısa mövzu" /></label><label>Mesaj<textarea name="body" maxlength="4000" required placeholder="Təklifini və ya şikayətini yaz."></textarea></label><button class="primary" type="submit">Göndər</button><p class="message"></p>`;
  requestForm.addEventListener("submit", async (event) => { event.preventDefault(); const values = new FormData(requestForm); const button = requestForm.querySelector("button"); const message = requestForm.querySelector(".message"); button.disabled = true; try { await api("/student/dashboard/requests", { method:"POST", body:JSON.stringify({ type:values.get("type"), subject:values.get("subject"), body:values.get("body") }) }); setMessage(message, "Müraciətin komandaya göndərildi.", "success"); requestForm.reset(); } catch (error) { setMessage(message, error.message, "error"); } finally { button.disabled = false; } });
  requestPanel.append(requestList, requestForm);
  grid.append(journeyPanel, lessons, ideaPanel, gamePanel, labPanel, portfolioPanel, programPanel, ratingPanel, attendancePanel, reviewPanel, requestPanel); root.append(grid);
  mountWorkspace(user, "student", [
    { group:true, label:"ƏSAS" }, { label:"Ana səhifə", target:"overview" }, { label:"Qruplarım və cədvəl", target:"student-schedule" },
    { group:true, label:"TƏDRİS" }, { label:"Dərslər və materiallar", target:"student-materials" }, { label:"Tapşırıq və rating", target:"student-rating" }, { label:"Davamiyyət", target:"student-attendance" }, { label:"Təlim rəyi", target:"student-reviews" },
    { group:true, label:"FƏALİYYƏTLƏR" }, { label:"Layihə ideyası", target:"student-ideas" }, { label:"Coolab Lab və oyunlar", target:"student-lab" }, { label:"Portfolio", target:"student-portfolio" }, { label:"Təklif və şikayət", target:"student-feedback" },
  ]);
};

const renderMentorGroupTools = (detail, target, user) => {
  target.replaceChildren();
  const students = detail.students ?? [];
  const summary = text("p", `${detail.group.courseTitle} · ${detail.group.groupName} · ${students.length} aktiv şagird`, "form-note");
  const addStudentForm = document.createElement("form"); addStudentForm.className = "form";
  addStudentForm.innerHTML = `<h3>Şagirdi qrupa əlavə et</h3><label>Şagird<select name="studentProfileId" required disabled><option>Şagirdlər yüklənir…</option></select></label><button class="primary" type="submit" disabled>Şagirdi əlavə et</button><p class="message"></p>`;
  const availableStudentSelect = addStudentForm.elements.studentProfileId;
  const addStudentButton = addStudentForm.querySelector("button");
  void api("/mentor/students").then((availableStudents) => {
    const enrolled = new Set(students.map((student) => student.studentProfileId));
    availableStudentSelect.replaceChildren();
    availableStudents.filter((student) => !enrolled.has(student.studentProfileId)).forEach((student) => availableStudentSelect.append(new Option(`${student.displayName}${student.email ? ` · ${student.email}` : ""}`, student.studentProfileId)));
    if (!availableStudentSelect.options.length) availableStudentSelect.append(new Option("Əlavə ediləcək aktiv şagird yoxdur", ""));
    availableStudentSelect.disabled = !availableStudentSelect.options[0]?.value;
    addStudentButton.disabled = availableStudentSelect.disabled;
  }).catch((error) => { availableStudentSelect.replaceChildren(new Option(error.message || "Şagird siyahısı yüklənmədi", "")); });
  addStudentForm.addEventListener("submit", async (event) => { event.preventDefault(); const message = addStudentForm.querySelector(".message"); addStudentButton.disabled = true; try { await api(`/mentor/course-groups/${detail.group.groupId}/students`, { method:"POST", body:JSON.stringify({ studentProfileId:availableStudentSelect.value }) }); setMessage(message, "Şagird qrupa əlavə edildi.", "success"); const refreshed = await api(`/mentor/course-groups/${detail.group.groupId}`); renderMentorGroupTools(refreshed, target, user); } catch (error) { setMessage(message, error.message, "error"); addStudentButton.disabled = false; } });
  const assignmentForm = document.createElement("form"); assignmentForm.className = "form";
  assignmentForm.innerHTML = `<h3>Tapşırıq paylaş</h3><label>Başlıq<input name="title" maxlength="240" required placeholder="Məsələn, Sensorlu LED sistemi" /></label><label>İzah<textarea name="description" maxlength="10000" placeholder="Tapşırığın məqsədi və təhvil şərtləri"></textarea></label><div class="split"><label>Maksimum bal<input name="maxScore" type="number" min="1" value="100" required /></label><label>Son tarix<input name="dueAt" type="datetime-local" /></label></div><label class="check"><input name="publishNow" type="checkbox" checked /> İndi yayımla</label><button class="primary" type="submit">Tapşırığı yarat</button><p class="message"></p>`;
  assignmentForm.addEventListener("submit", async (event) => { event.preventDefault(); const values = new FormData(assignmentForm); const button = assignmentForm.querySelector("button"); const message = assignmentForm.querySelector(".message"); button.disabled = true; try { await api(`/mentor/course-groups/${detail.group.groupId}/assignments`, { method:"POST", body:JSON.stringify({ title:values.get("title"), description:values.get("description") || null, maxScore:Number(values.get("maxScore")), dueAt:values.get("dueAt") ? new Date(values.get("dueAt")).toISOString() : null, publishNow:values.get("publishNow") === "on" }) }); setMessage(message, "Tapşırıq yaradıldı.", "success"); } catch (error) { setMessage(message, error.message, "error"); } finally { button.disabled = false; } });
  const attendanceForm = document.createElement("form"); attendanceForm.className = "form";
  attendanceForm.innerHTML = `<h3>Davamiyyət qeyd et</h3><label>Tarix<input name="attendanceDate" type="date" required /></label><div class="attendance-entries"></div><button class="primary" type="submit">Davamiyyəti yadda saxla</button><p class="message"></p>`;
  attendanceForm.elements.attendanceDate.value = new Date().toISOString().slice(0, 10);
  const entries = attendanceForm.querySelector(".attendance-entries");
  if (!students.length) entries.append(text("div", "Bu qrupda aktiv şagird yoxdur.", "empty"));
  students.forEach((student) => { const line = document.createElement("label"); line.className = "attendance-line"; line.innerHTML = `<span>${student.displayName}</span><select data-student-id="${student.studentProfileId}"><option value="present">İştirak edib</option><option value="late">Gecikib</option><option value="absent">Qayıb</option><option value="excused">Üzrlü</option></select>`; entries.append(line); });
  attendanceForm.addEventListener("submit", async (event) => { event.preventDefault(); const button = attendanceForm.querySelector("button"); const message = attendanceForm.querySelector(".message"); button.disabled = true; try { const attendanceDate = new Date(`${attendanceForm.elements.attendanceDate.value}T00:00:00`).toISOString(); const entriesData = [...entries.querySelectorAll("select")].map((select) => ({ studentProfileId:select.dataset.studentId, status:select.value })); await api(`/mentor/course-groups/${detail.group.groupId}/attendance`, { method:"PUT", body:JSON.stringify({ attendanceDate, entries:entriesData }) }); setMessage(message, "Davamiyyət yadda saxlanıldı.", "success"); } catch (error) { setMessage(message, error.message, "error"); } finally { button.disabled = false; } });
  const gradingPanel = document.createElement("section"); gradingPanel.className = "form mentor-grades"; gradingPanel.append(text("h3", "Qiymətləndirmə və təlim rəyi"));
  if (!detail.assignments?.length || !students.length) gradingPanel.append(text("p", "Qiymət vermək üçün ən azı bir tapşırıq və aktiv şagird olmalıdır.", "form-note"));
  else {
    const gradeForm = document.createElement("form"); gradeForm.className = "form";
    gradeForm.innerHTML = `<label>Tapşırıq<select name="assignmentId"></select></label><label>Şagird<select name="studentProfileId"></select></label><div class="split"><label>Bal<input name="score" type="number" min="0" required /></label><label>Rəy<input name="feedback" maxlength="3000" placeholder="Qısa mentor rəyi" /></label></div><button class="primary" type="submit">Qiyməti yadda saxla</button><p class="message"></p>`;
    const assignmentSelect = gradeForm.elements.assignmentId; detail.assignments.forEach((assignment) => assignmentSelect.append(new Option(`${assignment.title} (${assignment.maxScore} bal)`, assignment.id)));
    const studentSelect = gradeForm.elements.studentProfileId; students.forEach((student) => studentSelect.append(new Option(student.displayName, student.studentProfileId)));
    const syncMaxScore = () => { const assignment = detail.assignments.find((item) => item.id === assignmentSelect.value); gradeForm.elements.score.max = assignment?.maxScore ?? 100; }; syncMaxScore(); assignmentSelect.addEventListener("change", syncMaxScore);
    gradeForm.addEventListener("submit", async (event) => { event.preventDefault(); const values = new FormData(gradeForm); const button = gradeForm.querySelector("button"); const message = gradeForm.querySelector(".message"); button.disabled = true; try { await api(`/mentor/assignments/${values.get("assignmentId")}/grades/${values.get("studentProfileId")}`, { method:"PUT", body:JSON.stringify({ score:Number(values.get("score")), feedback:values.get("feedback") || null }) }); setMessage(message, "Qiymət yadda saxlanıldı.", "success"); } catch (error) { setMessage(message, error.message, "error"); } finally { button.disabled = false; } });
    gradingPanel.append(gradeForm);
  }
  const reviewForm = document.createElement("form"); reviewForm.className = "form";
  reviewForm.innerHTML = `<h3>Şagirdə təlim rəyi</h3><label>Şagird<select name="studentProfileId"></select></label><label>Başlıq<input name="title" maxlength="160" placeholder="Məsələn, Növbəti addım" /></label><label>Rəy<textarea name="body" maxlength="4000" required placeholder="Şagirdin inkişafı üçün konkret və dəstəkləyici rəy yazın."></textarea></label><button class="primary" type="submit">Rəyi paylaş</button><p class="message"></p>`;
  students.forEach((student) => reviewForm.elements.studentProfileId.append(new Option(student.displayName, student.studentProfileId))); reviewForm.querySelector("button").disabled = !students.length;
  reviewForm.addEventListener("submit", async (event) => { event.preventDefault(); const values = new FormData(reviewForm); const button = reviewForm.querySelector("button"); const message = reviewForm.querySelector(".message"); button.disabled = true; try { await api(`/mentor/course-groups/${detail.group.groupId}/training-reviews`, { method:"POST", body:JSON.stringify({ studentProfileId:values.get("studentProfileId"), title:values.get("title") || null, body:values.get("body") }) }); setMessage(message, "Təlim rəyi şagird kabinetində göründü.", "success"); reviewForm.reset(); } catch (error) { setMessage(message, error.message, "error"); } finally { button.disabled = false; } });
  target.append(summary, addStudentForm, assignmentForm, attendanceForm, gradingPanel, reviewForm);
};

const renderMentor = async (user) => {
  const [groups, lessonHistory, courses] = await Promise.all([api("/mentor/course-groups"), api("/mentor/lessons"), api("/catalog/courses")]);
  root.replaceChildren(
    createHero(user, "Mentor kabineti", `Salam, ${user.firstName}!`, "Qruplarınızı izləyin, dərs yaradın və materialları şagirdlər üçün paylaşın."),
    createSummary([{ label:"Kurs", value:String(courses.length) }, { label:"Qrup", value:String(groups.length) }, { label:"Şagird", value:String(groups.reduce((total,item) => total + item.activeStudentCount,0)) }]),
  );
  const grid = document.createElement("div"); grid.className = "dashboard-grid";
  let courseSelect;
  const coursePanel = panel("Kurslar", "Əvvəl kursu seçin, sonra həmin kursun daxilində qruplarınızı və dərslərinizi idarə edin.", `${courses.length} kurs`);
  coursePanel.id = "mentor-courses"; coursePanel.classList.add("wide");
  const courseList = document.createElement("div"); courseList.className = "mentor-course-list";
  courses.forEach((course, index) => {
    const courseGroups = groups.filter((group) => group.courseId === course.id);
    const studentCount = courseGroups.reduce((total, group) => total + group.activeStudentCount, 0);
    const item = document.createElement("article"); item.className = "mentor-course-card"; item.dataset.course = String(index);
    const top = document.createElement("div"); top.className = "mentor-course-top";
    const heading = document.createElement("div");
    const kicker = document.createElement("span"); kicker.className = "mentor-course-kicker";
    const dots = document.createElement("span"); dots.className = "coolab-word-dots"; dots.setAttribute("aria-hidden", "true");
    kicker.append(dots, "COOLAB TƏDRİS SAHƏSİ");
    heading.append(kicker, text("h3", course.title));
    top.append(heading, text("span", `${courseGroups.length} qrup`, "mentor-course-count"));
    const description = text("p", course.description || "Bu kurs üzrə qruplar, dərslər və şagird inkişafı buradan idarə olunur.");
    const groupPills = document.createElement("div"); groupPills.className = "mentor-group-pills";
    if (courseGroups.length) courseGroups.forEach((group) => groupPills.append(text("span", `${group.groupName} · ${group.activeStudentCount} şagird`, "mentor-group-pill")));
    else groupPills.append(text("span", "Hələ qrup yoxdur", "mentor-group-pill"));
    const footer = document.createElement("div"); footer.className = "mentor-course-footer";
    const createForCourse = text("button", "Qrup yarat →", "mentor-course-action"); createForCourse.type = "button";
    createForCourse.addEventListener("click", () => { if (courseSelect) courseSelect.value = course.id; document.querySelector("#mentor-create-group")?.scrollIntoView({ behavior:"smooth", block:"center" }); });
    footer.append(createForCourse, text("span", `${studentCount} aktiv şagird`, "mentor-course-meta"));
    item.append(top, description, groupPills, footer); courseList.append(item);
  });
  coursePanel.append(courseList);
  const groupPanel = panel("Qruplarım", "Qrup kursun içində yaradılır. Burada yalnız sizə aid qruplar görünür.", `${groups.length} qrup`);
  groupPanel.id = "mentor-groups";
  const groupList = document.createElement("div"); groupList.className = "mentor-group-list";
  if (!groups.length) groupList.append(text("div", "Hələ sizə qrup təyin edilməyib.", "empty"));
  groups.forEach((group) => { const card = document.createElement("article"); card.className = "mentor-group-card"; const icon = text("span", group.courseTitle.slice(0, 1).toUpperCase(), "mentor-group-icon"); const copy = document.createElement("div"); copy.append(text("strong", group.groupName), text("span", `${group.courseTitle}${group.scheduleNote ? ` · ${group.scheduleNote}` : ""}`)); const metrics = document.createElement("div"); metrics.className = "mentor-group-metrics"; metrics.append(text("b", `${group.activeStudentCount} şagird`), text("b", `${group.lessonCount} dərs`)); card.append(icon, copy, metrics); groupList.append(card); });
  groupPanel.append(groupList);
  const quickPanel = panel("Sürətli əməliyyatlar", "Gündəlik mentor işlərini bir toxunuşla açın."); quickPanel.id = "mentor-quick-actions"; quickPanel.classList.add("wide");
  const quickList = document.createElement("div"); quickList.className = "mentor-quick-panel";
  [["+", "Yeni qrup", "Kurs seçib yeni tədris qrupu yaradın.", "mentor-create-group"], ["↗", "Dərs paylaş", "Material, video və linklə dərsi yayımlayın.", "mentor-lessons"], ["✓", "Qiymət və davamiyyət", "Şagird nəticələrini və iştirakı qeyd edin.", "mentor-progress"]].forEach(([icon, title, copy, target]) => { const button = document.createElement("button"); button.type = "button"; button.className = "mentor-quick-action"; button.append(text("b", `${icon}  ${title}`), text("span", copy)); button.addEventListener("click", () => document.querySelector(`#${target}`)?.scrollIntoView({ behavior:"smooth", block:"start" })); quickList.append(button); }); quickPanel.append(quickList);
  const createGroupPanel = panel("Yeni qrup yarat", "Mövcud kurs üçün qrup yaradın; siz həmin qrupun aparıcı mentoruna çevrilirsiniz.");
  createGroupPanel.id = "mentor-create-group";
  const createGroupForm = document.createElement("form"); createGroupForm.className = "form";
  createGroupForm.innerHTML = `<label>Kurs<select name="courseId" required></select></label><label>Qrupun adı<input name="name" maxlength="160" required placeholder="Məsələn, Robot A" /></label><label>Dərs cədvəli<input name="scheduleNote" maxlength="1000" placeholder="B.e. və C.a., 16:00" /></label><label>Yer sayı<input name="capacity" type="number" min="1" max="500" placeholder="12" /></label><button class="primary" type="submit">Qrupu yarat</button><p class="message"></p>`;
  courseSelect = createGroupForm.querySelector("select");
  if (!courses.length) { const option = new Option("Yayımlanmış kurs yoxdur", ""); option.disabled = true; option.selected = true; courseSelect.append(option); createGroupForm.querySelector("button").disabled = true; }
  courses.forEach((course) => courseSelect.append(new Option(course.title, course.id)));
  createGroupForm.addEventListener("submit", async (event) => { event.preventDefault(); const values = new FormData(createGroupForm); const button = createGroupForm.querySelector("button"); const message = createGroupForm.querySelector(".message"); button.disabled = true; try { await api("/mentor/course-groups", { method:"POST", body:JSON.stringify({ courseId:values.get("courseId"), name:values.get("name"), scheduleNote:values.get("scheduleNote") || null, capacity:values.get("capacity") ? Number(values.get("capacity")) : null }) }); setMessage(message, "Qrup yaradıldı.", "success"); await renderPortal(user); } catch (error) { setMessage(message, error.message, "error"); } finally { button.disabled = false; } });
  createGroupPanel.append(createGroupForm);
  const lessonPanel = panel("Yeni dərs paylaş", "Dərsi, tapşırığı, linkləri və materialları bir yerdə yaradın.");
  lessonPanel.id = "mentor-lessons";
  const form = document.createElement("form"); form.className = "form"; form.id = "lesson-form";
  const groupLabel = text("label", "Qrup"); const groupSelect = document.createElement("select"); groupSelect.name = "courseGroupId"; groupSelect.required = true;
  groups.forEach((group) => { const option = document.createElement("option"); option.value = group.groupId; option.textContent = `${group.courseTitle} — ${group.groupName}`; groupSelect.append(option); }); groupLabel.append(groupSelect);
  const titleLabel = text("label", "Dərsin başlığı"); const titleInput = document.createElement("input"); titleInput.name = "title"; titleInput.maxLength = 240; titleInput.required = true; titleInput.placeholder = "Məsələn, LED işıqların əsasları"; titleLabel.append(titleInput);
  const bodyLabel = text("label", "İzah və tapşırıq"); const bodyInput = document.createElement("textarea"); bodyInput.name = "body"; bodyInput.maxLength = 10000; bodyInput.placeholder = "Şagirdlər üçün qısa izah, tapşırıq və gözlənilən nəticəni yazın."; bodyLabel.append(bodyInput);
  const materialEditor = document.createElement("section"); materialEditor.className = "material-editor"; materialEditor.append(text("h3", "Link və materiallar"), text("p", "Mətn, video və xarici link əlavə edə bilərsiniz."));
  const materialRows = document.createElement("div"); materialRows.className = "material-rows";
  const addMaterialRow = () => { const row = document.createElement("div"); row.className = "material-row"; const type = document.createElement("select"); type.name = "materialType"; [["text", "Mətn / tapşırıq"], ["externalLink", "Xarici link"], ["video", "Video linki"]].forEach(([value, label]) => { const option = document.createElement("option"); option.value = value; option.textContent = label; type.append(option); }); const materialTitle = document.createElement("input"); materialTitle.name = "materialTitle"; materialTitle.maxLength = 240; materialTitle.placeholder = "Materialın adı"; const materialValue = document.createElement("input"); materialValue.name = "materialValue"; materialValue.maxLength = 10000; materialValue.placeholder = "Link və ya qısa mətn"; const remove = text("button", "Sil", "secondary"); remove.type = "button"; remove.addEventListener("click", () => row.remove()); row.append(type, materialTitle, materialValue, remove); materialRows.append(row); };
  const addMaterial = text("button", "+ Material əlavə et", "secondary"); addMaterial.type = "button"; addMaterial.addEventListener("click", addMaterialRow); materialEditor.append(materialRows, addMaterial);
  const publishLabel = document.createElement("label"); publishLabel.className = "check"; const publishInput = document.createElement("input"); publishInput.type = "checkbox"; publishInput.name = "publishNow"; publishInput.checked = true; publishLabel.append(publishInput, document.createTextNode(" Dərsi indi yayımla"));
  const submit = text("button", "Dərsi paylaş", "primary"); submit.type = "submit"; submit.disabled = !groups.length; const message = text("p", "", "message");
  form.append(groupLabel, titleLabel, bodyLabel, materialEditor, publishLabel, submit, message); lessonPanel.append(form);
  const historyPanel = panel("Dərslərim", "Yaradılan qaralamaları yoxlayın və hazır olduqda yayımlayın.", `${lessonHistory.length} dərs`); historyPanel.classList.add("wide"); const historyList = document.createElement("div"); historyList.className = "cards";
  historyPanel.id = "mentor-history";
  if (!lessonHistory.length) historyList.append(text("div", "Hələ dərs yaratmamısınız.", "empty"));
  lessonHistory.forEach((lesson) => { const card = document.createElement("article"); card.className = "lesson mentor-lesson"; card.append(text("h3", lesson.title), text("p", `${lesson.courseTitle} · ${lesson.groupName} · ${displayStatus(lesson.status)}`)); if (lesson.body) card.append(text("p", lesson.body)); lesson.materials.forEach((material) => card.append(text("span", `${material.type === "externalLink" ? "↗ " : "• "}${material.title}`, "material"))); if (lesson.status === "draft" || lesson.status === "scheduled") { const publish = text("button", "İndi yayımla", "secondary"); publish.type = "button"; publish.addEventListener("click", async () => { publish.disabled = true; try { await api(`/mentor/lessons/${lesson.id}/publish`, { method:"POST" }); await renderPortal(user); } finally { publish.disabled = false; } }); card.append(publish); } historyList.append(card); }); historyPanel.append(historyList);
  const progressPanel = panel("Qiymətləndirmə, davamiyyət və təlim rəyi", "Qrup seçin, şagirdləri qiymətləndirin, davamiyyəti qeyd edin və fərdi rəy yazın.");
  progressPanel.id = "mentor-progress";
  const groupTools = document.createElement("div"); groupTools.className = "form";
  groupTools.innerHTML = `<label>Qrup<select name="groupId" required></select></label><button type="button" class="secondary">Qrup məlumatını aç</button><div class="mentor-group-tools"></div><p class="message"></p>`;
  const toolsSelect = groupTools.querySelector("select"); groups.forEach((group) => toolsSelect.append(new Option(`${group.courseTitle} — ${group.groupName}`, group.groupId)));
  const toolsButton = groupTools.querySelector("button"); const toolsArea = groupTools.querySelector(".mentor-group-tools"); const toolsMessage = groupTools.querySelector(".message");
  toolsButton.disabled = !groups.length;
  toolsButton.addEventListener("click", async () => { toolsButton.disabled = true; try { const detail = await api(`/mentor/course-groups/${toolsSelect.value}`); renderMentorGroupTools(detail, toolsArea, user); } catch (error) { setMessage(toolsMessage, error.message, "error"); } finally { toolsButton.disabled = false; } });
  progressPanel.append(groupTools);
  grid.append(coursePanel, quickPanel, groupPanel, createGroupPanel, lessonPanel, historyPanel, progressPanel); root.append(grid);
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); const values = new FormData(form); const rows = [...materialRows.querySelectorAll(".material-row")]; const materials = rows.map((row) => ({ type:row.querySelector('[name="materialType"]').value, title:row.querySelector('[name="materialTitle"]').value.trim(), contentOrUrl:row.querySelector('[name="materialValue"]').value.trim() || null })).filter((material) => material.title);
    submit.disabled = true; try { await api(`/mentor/course-groups/${values.get("courseGroupId")}/lessons`, { method:"POST", body:JSON.stringify({ title:values.get("title"), body:values.get("body") || null, publishNow:values.get("publishNow") === "on", materials }) }); setMessage(message, values.get("publishNow") === "on" ? "Dərs yayımlandı." : "Dərs qaralama kimi saxlanıldı.", "success"); form.reset(); publishInput.checked = true; materialRows.replaceChildren(); await renderPortal(user); }
    catch (error) { setMessage(message, error.message, "error"); } finally { submit.disabled = false; }
  });
  mountWorkspace(user, "mentor", [
    { group:true, label:"ƏSAS" }, { label:"Ana səhifə", target:"overview" }, { label:"Kurslarım", target:"mentor-courses" }, { label:"Qruplarım", target:"mentor-groups" }, { label:"Yeni qrup", target:"mentor-create-group" },
    { group:true, label:"TƏDRİS" }, { label:"Dərs və material paylaş", target:"mentor-lessons" }, { label:"Dərs tarixçəsi", target:"mentor-history" }, { label:"Qiymət və davamiyyət", target:"mentor-progress" },
  ]);
};

const adminTabs = [
  ["overview", "İcmal"], ["applications", "Qeydiyyatlar"], ["people", "İstifadəçilər"], ["courses", "Kurslar"], ["groups", "Qruplar"],
  ["products", "Məhsullar"], ["orders", "Sifarişlər"], ["studentRequests", "Təkliflər"], ["sales", "Satış müraciətləri"], ["content", "Məzmun"],
];

const adminTabBar = (user) => {
  const tabs = document.createElement("nav");
  tabs.className = "admin-tabs";
  adminTabs.forEach(([key, label]) => {
    const button = text("button", label, `admin-tab${adminSection === key ? " is-active" : ""}`);
    button.type = "button";
    button.addEventListener("click", () => { adminSection = key; void renderAdmin(user); });
    tabs.append(button);
  });
  return tabs;
};

const adminForm = (title, copy, id, fields, onSubmit) => {
  const panelNode = panel(title, copy);
  const form = document.createElement("form"); form.className = "form"; form.id = id;
  fields.forEach((field) => {
    if (field.type === "checkbox") {
      const label = document.createElement("label"); label.className = "check";
      const input = document.createElement("input"); input.type = "checkbox"; input.name = field.name; input.checked = field.checked ?? false;
      label.append(input, document.createTextNode(` ${field.label}`)); form.append(label); return;
    }
    const label = document.createElement("label"); label.textContent = field.label;
    const input = document.createElement(field.type === "textarea" ? "textarea" : "input");
    input.name = field.name; input.required = field.required ?? false; input.value = field.value ?? ""; input.placeholder = field.placeholder ?? "";
    if (field.type && field.type !== "textarea") input.type = field.type;
    if (field.step != null) input.step = String(field.step);
    if (field.min != null) input.min = String(field.min);
    if (field.options) {
      const select = document.createElement("select"); select.name = field.name; select.required = field.required ?? false;
      field.options.forEach((option) => { const optionNode = document.createElement("option"); optionNode.value = option.value; optionNode.textContent = option.label; optionNode.selected = option.value === field.value; select.append(optionNode); });
      label.append(select);
    } else label.append(input);
    form.append(label);
  });
  const submit = text("button", "Yadda saxla", "primary"); submit.type = "submit";
  const message = text("p", "", "message"); form.append(submit, message);
  form.addEventListener("submit", async (event) => { event.preventDefault(); submit.disabled = true; try { await onSubmit(new FormData(form)); setMessage(message, "Dəyişiklik yadda saxlanıldı.", "success"); } catch (error) { setMessage(message, error.message, "error"); } finally { submit.disabled = false; } });
  panelNode.append(form); return panelNode;
};

const renderApplications = async (user, target) => {
  const applications = await api("/admin/role-applications");
  const pending = applications.filter((item) => ["submitted", "underReview"].includes(item.status));
  const panelNode = panel("Yeni qeydiyyatlar", "Təsdiqlənən istifadəçiyə seçdiyi rol verilir və hesabı aktivləşir.", `${pending.length} gözləyir`); panelNode.classList.add("wide");
  const list = document.createElement("div");
  if (!pending.length) list.append(text("div", "Hazırda təsdiq gözləyən müraciət yoxdur.", "empty"));
  pending.forEach((application) => {
    const card = document.createElement("article"); card.className = "application";
    const top = document.createElement("div"); top.className = "application-top";
    const copy = document.createElement("div"); copy.append(text("h3", application.applicantName), text("p", `${application.applicantEmail} · ${formatDate(application.submittedAt)}`));
    const badges = document.createElement("div"); badges.className = "application-badges";
    badges.append(text("span", application.requestedRole === "student" ? "Şagird" : "Mentor", "badge yellow"));
    badges.append(text("span", application.emailConfirmed ? "E-poçt təsdiqlənib" : "E-poçt təsdiqi gözlənilir", `badge ${application.emailConfirmed ? "" : "orange"}`));
    top.append(copy, badges); card.append(top);
    const review = document.createElement("div"); review.className = "review-row";
    const note = document.createElement("input"); note.placeholder = "Qısa qeyd (istəyə bağlı)";
    const approve = text("button", "Təsdiqlə", "primary"); approve.type = "button";
    approve.disabled = !application.emailConfirmed;
    if (!application.emailConfirmed) approve.title = "İstifadəçi e-poçt ünvanını təsdiqlədikdən sonra hesab aktivləşə bilər.";
    const reject = text("button", "Rədd et", "danger"); reject.type = "button";
    const performReview = async (approveValue) => { approve.disabled = true; reject.disabled = true; try { await api(`/admin/role-applications/${application.id}/review`, { method:"POST", body:JSON.stringify({ approve:approveValue, reviewNote:note.value || null }) }); void renderPortal(user); } catch (error) { approve.disabled = false; reject.disabled = false; note.value = error.message; } };
    approve.addEventListener("click", () => void performReview(true)); reject.addEventListener("click", () => void performReview(false));
    review.append(note, approve, reject); card.append(review); list.append(card);
  });
  panelNode.append(list); target.append(panelNode);
};

const renderCourses = async (target) => {
  const courses = await api("/admin/courses");
  const listPanel = panel("Kurslar", "Dərc edilmiş və qaralama kursları buradan idarə edin.", `${courses.length} kurs`);
  const list = document.createElement("div"); list.className = "cards";
  if (!courses.length) list.append(text("div", "Hələ kurs yoxdur.", "empty"));
  courses.forEach((course) => {
    const item = createItem(course.title, `${course.slug} · ${course.minAge ?? "—"}–${course.maxAge ?? "—"} yaş · ${course.groupCount} qrup`, course.isPublished ? "Yayımdadır" : "Qaralama", course.isPublished ? "" : "orange");
    const edit = text("button", "Redaktə et", "secondary"); edit.type = "button";
    edit.addEventListener("click", () => { const form = document.querySelector("#course-form"); if (!form) return; form.dataset.id = course.id; form.elements.title.value = course.title; form.elements.slug.value = course.slug; form.elements.description.value = course.description ?? ""; form.elements.minAge.value = course.minAge ?? ""; form.elements.maxAge.value = course.maxAge ?? ""; form.elements.isPublished.checked = course.isPublished; form.scrollIntoView({ behavior:"smooth", block:"center" }); });
    item.append(edit); list.append(item);
  });
  listPanel.append(list);
  const formPanel = adminForm("Yeni kurs / kursu redaktə et", "Kursu yaradın və ya siyahıdan seçərək yeniləyin.", "course-form", [
    { name:"title", label:"Kursun adı", required:true, placeholder:"Məsələn, Robototexnika" }, { name:"slug", label:"URL açarı", required:true, placeholder:"robototexnika" },
    { name:"description", label:"Qısa izah", type:"textarea", placeholder:"Kurs haqqında qısa məlumat" }, { name:"minAge", label:"Minimum yaş", type:"number" }, { name:"maxAge", label:"Maksimum yaş", type:"number" }, { name:"isPublished", label:"Saytda yayımla", type:"checkbox", checked:true },
  ], async (data) => { const form = document.querySelector("#course-form"); const body = { title:data.get("title"), slug:data.get("slug"), description:data.get("description") || null, minAge:data.get("minAge") ? Number(data.get("minAge")) : null, maxAge:data.get("maxAge") ? Number(data.get("maxAge")) : null, isPublished:data.get("isPublished") === "on" }; await api(form.dataset.id ? `/admin/courses/${form.dataset.id}` : "/admin/courses", { method:form.dataset.id ? "PUT" : "POST", body:JSON.stringify(body) }); form.dataset.id = ""; form.reset(); await renderAdmin(activeUser); });
  target.append(listPanel, formPanel);
};

const renderGroups = async (target) => {
  const [courses, groups] = await Promise.all([api("/admin/courses"), api("/admin/course-groups")]);
  const listPanel = panel("Tədris qrupları", "Kurs qruplarını, yer sayını və dərs vaxtını yönəldin.", `${groups.length} qrup`);
  const list = document.createElement("div"); list.className = "cards";
  if (!groups.length) list.append(text("div", "Hələ tədris qrupu yoxdur.", "empty"));
  groups.forEach((group) => { const item = createItem(group.courseTitle, `${group.name}${group.scheduleNote ? ` · ${group.scheduleNote}` : ""} · ${group.enrollmentCount}${group.capacity ? `/${group.capacity}` : ""} şagird · ${group.mentorCount ?? 0} mentor`, group.isActive ? "Aktiv" : "Bağlı", group.isActive ? "" : "orange"); const edit = text("button", "Redaktə et", "secondary"); edit.type = "button"; edit.addEventListener("click", () => { const form=document.querySelector("#group-form"); if(!form)return; form.dataset.id=group.id; form.elements.courseId.value=group.courseId; form.elements.name.value=group.name; form.elements.scheduleNote.value=group.scheduleNote ?? ""; form.elements.capacity.value=group.capacity ?? ""; form.elements.isActive.checked=group.isActive; form.scrollIntoView({behavior:"smooth",block:"center"}); }); item.append(edit); list.append(item); });
  listPanel.append(list);
  const formPanel = adminForm("Yeni tədris qrupu", "Əvvəl kurs yaradın, sonra ona qrup əlavə edin.", "group-form", [
    { name:"courseId", label:"Kurs", required:true, options:courses.map((course) => ({ value:course.id, label:course.title })) }, { name:"name", label:"Qrupun adı", required:true, placeholder:"Məsələn, Robot A" }, { name:"scheduleNote", label:"Dərs vaxtı", placeholder:"Çərşənbə axşamı, 16:00" }, { name:"capacity", label:"Maksimum şagird sayı", type:"number" }, { name:"isActive", label:"Qrup aktivdir", type:"checkbox", checked:true },
  ], async (data) => { const form=document.querySelector("#group-form"); const body={ courseId:data.get("courseId"), name:data.get("name"), scheduleNote:data.get("scheduleNote") || null, capacity:data.get("capacity") ? Number(data.get("capacity")) : null, startsAt:null, endsAt:null, isActive:data.get("isActive") === "on" }; await api(form.dataset.id ? `/admin/course-groups/${form.dataset.id}` : "/admin/course-groups", {method:form.dataset.id ? "PUT" : "POST",body:JSON.stringify(body)}); form.dataset.id=""; form.reset(); await renderAdmin(activeUser); });
  target.append(listPanel, formPanel);
};

const renderPeople = async (target) => {
  const [users, groups] = await Promise.all([api("/admin/users"), api("/admin/course-groups")]);
  const panelNode = panel("İstifadəçilər və təyinatlar", "Mentorları və şagirdləri idarə edin, qruplara birbaşa təyin edin.", `${users.length} hesab`);
  panelNode.classList.add("wide");
  const stats = document.createElement("div"); stats.className = "admin-overview-stats";
  [["Mentor", users.filter((user) => user.roles.some((role) => String(role).toLowerCase() === "mentor")).length], ["Şagird", users.filter((user) => user.roles.some((role) => String(role).toLowerCase() === "student")).length], ["Aktiv", users.filter((user) => user.accountStatus === "active").length]].forEach(([label, value]) => stats.append(createItem(label, "", String(value))));
  const assignment = document.createElement("form"); assignment.className = "form";
  assignment.innerHTML = `<h3>Qrupa təyinat et</h3><label>Qrup<select name="groupId" required></select></label><label>Mentor<select name="mentorUserId"><option value="">Mentor seçilməyib</option></select></label><label>Şagird<select name="studentProfileId"><option value="">Şagird seçilməyib</option></select></label><label class="check"><input type="checkbox" name="isLead" /> Aparıcı mentor</label><button class="primary" type="submit">Təyinatı yadda saxla</button><p class="message"></p>`;
  groups.forEach((group) => assignment.elements.groupId.append(new Option(`${group.courseTitle} · ${group.name}`, group.id)));
  users.filter((user) => user.roles.some((role) => String(role).toLowerCase() === "mentor") && user.accountStatus === "active").forEach((user) => assignment.elements.mentorUserId.append(new Option(`${user.displayName} · ${user.email}`, user.userId)));
  users.filter((user) => user.studentProfileId && user.accountStatus === "active").forEach((user) => assignment.elements.studentProfileId.append(new Option(`${user.displayName} · ${user.email}`, user.studentProfileId)));
  assignment.addEventListener("submit", async (event) => { event.preventDefault(); const form = event.currentTarget; const message = form.querySelector(".message"); const button = form.querySelector("button"); button.disabled = true; try { const groupId = form.elements.groupId.value; if (form.elements.mentorUserId.value) await api(`/admin/course-groups/${groupId}/mentors`, { method:"POST", body:JSON.stringify({ mentorUserId:form.elements.mentorUserId.value, isLead:form.elements.isLead.checked }) }); if (form.elements.studentProfileId.value) await api(`/admin/course-groups/${groupId}/students`, { method:"POST", body:JSON.stringify({ studentProfileId:form.elements.studentProfileId.value }) }); setMessage(message, "Təyinat yadda saxlanıldı.", "success"); } catch (error) { setMessage(message, error.message, "error"); } finally { button.disabled = false; } });
  const list = document.createElement("div"); list.className = "cards";
  users.forEach((user) => { const roles = user.roles.length ? user.roles.join(", ") : "rol yoxdur"; const item = createItem(user.displayName, `${user.email} · ${roles} · ${user.groupCount} qrup`, displayStatus(user.accountStatus), statusTone(user.accountStatus)); const select = document.createElement("select"); ["active", "suspended", "rejected", "pendingApproval"].forEach((status) => { const option = new Option(displayStatus(status), status); option.selected = status === user.accountStatus; select.append(option); }); const save = text("button", "Statusu yenilə", "secondary"); save.type = "button"; save.addEventListener("click", async () => { save.disabled = true; try { await api(`/admin/users/${user.userId}/status`, { method:"PUT", body:JSON.stringify({ status:select.value }) }); await renderAdmin(activeUser); } finally { save.disabled = false; } }); item.append(select, save); list.append(item); });
  panelNode.append(stats, assignment, list); target.append(panelNode);
};

const renderProducts = async (target) => {
  const products = await api("/admin/products");
  const listPanel = panel("Məhsul və qiymətlər", "Kurs, tədbir, rəqəmsal və fiziki məhsulları idarə edin.", `${products.length} məhsul`);
  const list = document.createElement("div"); list.className="cards";
  if (!products.length) list.append(text("div", "Hələ məhsul yoxdur.", "empty"));
  products.forEach((product) => { const stock = product.stockQuantity == null ? "Limitsiz stok" : `${product.stockQuantity} ədəd stok`; const price = product.price == null ? "Qiymət tezliklə" : `${product.price} ${product.currency}`; const item=createItem(product.name, `${product.sku} · ${product.type} · ${price} · ${stock}`, product.isActive ? "Aktiv" : "Passiv", product.isActive ? "" : "orange"); const edit=text("button","Redaktə et","secondary"); edit.type="button"; edit.addEventListener("click",()=>{const form=document.querySelector("#product-form");if(!form)return;form.dataset.id=product.id;form.elements.sku.value=product.sku;form.elements.name.value=product.name;form.elements.description.value=product.description ?? "";form.elements.type.value=product.type;form.elements.price.value=product.price ?? "";form.elements.currency.value=product.currency;form.elements.stockQuantity.value=product.stockQuantity ?? "";form.elements.isActive.checked=product.isActive;form.scrollIntoView({behavior:"smooth",block:"center"});});item.append(edit);list.append(item); });
  listPanel.append(list);
  const formPanel=adminForm("Yeni məhsul", "Qiymət dəyişəndə yeni qiymət tarixçəsi yaradılır.", "product-form", [
    {name:"sku",label:"SKU",required:true,placeholder:"COOLAB-CAMP"},{name:"name",label:"Proqramın adı",required:true,placeholder:"4 fəsil düşərgə"},{name:"description",label:"İzah",type:"textarea"},{name:"type",label:"Növ",required:true,value:"course",options:[{value:"course",label:"Kurs"},{value:"event",label:"Tədbir"},{value:"physical",label:"Fiziki məhsul"},{value:"digital",label:"Rəqəmsal məhsul"}]},{name:"price",label:"Qiymət (boş = tezliklə)",type:"number",min:0.01,step:0.01},{name:"currency",label:"Valyuta",required:true,value:"AZN"},{name:"stockQuantity",label:"Stok sayı (boş = limitsiz)",type:"number",min:0,step:1},{name:"isActive",label:"Proqram aktivdir",type:"checkbox",checked:true},
  ], async(data)=>{const form=document.querySelector("#product-form");const body={sku:data.get("sku"),name:data.get("name"),description:data.get("description")||null,type:data.get("type"),price:data.get("price") ? Number(data.get("price")) : null,currency:data.get("currency"),stockQuantity:data.get("stockQuantity") ? Number(data.get("stockQuantity")) : null,isActive:data.get("isActive")==="on"};await api(form.dataset.id?`/admin/products/${form.dataset.id}`:"/admin/products",{method:form.dataset.id?"PUT":"POST",body:JSON.stringify(body)});form.dataset.id="";form.reset();await renderAdmin(activeUser);});
  target.append(listPanel,formPanel);
};

const renderOrders = async (target) => {
  const orders=await api("/admin/orders"); const panelNode=panel("Sifarişlər və ödənişlər", "Epoint təsdiqi ilə ödənilmiş sifarişlər avtomatik yenilənir. Kart məlumatları Coolab-da saxlanılmır.", `${orders.length} sifariş`); const list=document.createElement("div"); list.className="cards";
  if(!orders.length) list.append(text("div","Hələ sifariş yoxdur.","empty"));
  orders.forEach((order)=>{const detail=`${order.orderNumber} · ${order.customerName} · ${order.total} ${order.currency}`;const item=createItem(order.customerEmail,detail,order.status,statusTone(order.status));const payment=order.payments?.[0];if(payment)item.append(text("span",`${payment.provider === "epoint" ? "Epoint" : payment.provider} · ${payment.status}${payment.paidAt ? ` · ${formatDate(payment.paidAt)}` : ""}`,"form-note"));const select=document.createElement("select");["pendingPayment","cancelled"].forEach((status)=>{const option=document.createElement("option");option.value=status;option.textContent=status==="pendingPayment"?"Ödəniş gözləyir":"Ləğv edildi";option.selected=status===order.status;select.append(option);});const save=text("button","Sifarişi yenilə","secondary");save.type="button";save.disabled=order.status!=="pendingPayment";save.addEventListener("click",async()=>{save.disabled=true;try{await api(`/admin/orders/${order.id}/status`,{method:"PUT",body:JSON.stringify({status:select.value})});await renderAdmin(activeUser);}finally{save.disabled=false;}});item.append(select,save);list.append(item);});panelNode.append(list);target.append(panelNode);
};

const renderSalesLeads = async (target) => {
  const leads = await api("/admin/sales/leads");
  const panelNode = panel("Satış müraciətləri", "Səbətdən və sayt çatından gələn sorğuları izləyin, müştəri ilə əlaqə saxlayın.", `${leads.length} sorğu`); panelNode.classList.add("wide");
  const list = document.createElement("div"); list.className = "cards";
  if (!leads.length) list.append(text("div", "Hələ satış müraciəti yoxdur.", "empty"));
  leads.forEach((lead) => {
    const detail = `${lead.source === "websiteCart" ? `${source("Proqram səbəti")} · ` : ""}${lead.contact}${lead.childAge ? ` · ${lead.childAge} yaş` : ""}${lead.interests ? ` · ${lead.interests}` : ""}${lead.suggestedProgram ? ` · ${lead.suggestedProgram}` : ""}`;
    const item = createItem(lead.fullName, detail, lead.status === "humanRequested" ? "İnsan dəstəyi gözləyir" : lead.status, lead.status === "humanRequested" ? "yellow" : "");
    const select = document.createElement("select"); ["humanRequested", "new", "contacted", "qualified", "closed"].forEach((status) => { const option = document.createElement("option"); option.value = status; option.textContent = ({ humanRequested:"İnsan dəstəyi", new:"Yeni", contacted:"Əlaqə saxlanıldı", qualified:"Uyğundur", closed:"Bağlandı" })[status]; option.selected = status === lead.status; select.append(option); });
    const save = text("button", "Satış statusunu yenilə", "secondary"); save.type = "button"; save.addEventListener("click", async () => { save.disabled = true; try { await api(`/admin/sales/leads/${lead.id}/status`, { method:"PUT", body:JSON.stringify({ status:select.value }) }); await renderAdmin(activeUser); } finally { save.disabled = false; } }); item.append(select, save); list.append(item);
  });
  panelNode.append(list); target.append(panelNode);
};

const renderContent = async (target) => {
  const entries=await api("/admin/site-content"); const listPanel=panel("Sayt məzmunu", "home.hero, home.portfolio və home.contact blokları ana səhifədə birbaşa görünür.", `${entries.length} blok`); const list=document.createElement("div");list.className="cards";
  if(!entries.length)list.append(text("div","Hələ məzmun bloku yoxdur.","empty"));
  entries.forEach((entry)=>{const item=createItem(entry.title,`${entry.key} · ${entry.isPublished?"Yayımdadır":"Qaralama"}`,entry.isPublished?"Aktiv":"Passiv",entry.isPublished?"":"orange");const edit=text("button","Redaktə et","secondary");edit.type="button";edit.addEventListener("click",()=>{const form=document.querySelector("#content-form");if(!form)return;form.elements.key.value=entry.key;form.elements.title.value=entry.title;form.elements.body.value=entry.body;form.elements.isPublished.checked=entry.isPublished;form.scrollIntoView({behavior:"smooth",block:"center"});});item.append(edit);list.append(item);});listPanel.append(list);
  const formPanel=adminForm("Məzmun bloku", "Ana səhifəyə bağlı açarlar: home.hero, home.portfolio, home.contact.", "content-form", [{name:"key",label:"Açar",required:true,placeholder:"home.hero"},{name:"title",label:"Başlıq",required:true},{name:"body",label:"Mətn",type:"textarea",required:true},{name:"isPublished",label:"Saytda göstər",type:"checkbox",checked:true}], async(data)=>{const body={key:data.get("key"),title:data.get("title"),body:data.get("body"),isPublished:data.get("isPublished")==="on"};await api(`/admin/site-content/${encodeURIComponent(body.key)}`,{method:"PUT",body:JSON.stringify(body)});await renderAdmin(activeUser);});target.append(listPanel,formPanel);
};

const renderStudentRequests = async (target) => {
  const requests = await api("/admin/student-requests");
  const panelNode = panel("Şagird təklifləri və şikayətləri", "Cavab verdikdə şagird öz kabinetində statusu və qeydi görəcək.", `${requests.length} müraciət`); panelNode.classList.add("wide");
  const list = document.createElement("div"); list.className = "cards";
  if (!requests.length) list.append(text("div", "Hələ şagird müraciəti yoxdur.", "empty"));
  requests.forEach((item) => {
    const card = document.createElement("article"); card.className = "item";
    const copy = document.createElement("div"); copy.append(text("strong", `${item.type === "complaint" ? "Şikayət" : "Təklif"}: ${item.subject}`), text("span", `${item.studentName} · ${item.studentEmail} · ${item.body}`));
    const controls = document.createElement("div"); controls.className = "review-row";
    const select = document.createElement("select"); ["new", "inReview", "resolved", "closed"].forEach((status) => { const option = new Option(({ new:"Yeni", inReview:"Baxılır", resolved:"Həll edildi", closed:"Bağlandı" })[status], status); option.selected = item.status === status; select.append(option); });
    const reply = document.createElement("input"); reply.maxLength = 4000; reply.placeholder = "Şagirdə cavab"; reply.value = item.adminReply ?? "";
    const save = text("button", "Yadda saxla", "secondary"); save.type = "button"; save.addEventListener("click", async () => { save.disabled = true; try { await api(`/admin/student-requests/${item.id}`, { method:"PUT", body:JSON.stringify({ status:select.value, adminReply:reply.value || null }) }); await renderAdmin(activeUser); } finally { save.disabled = false; } });
    controls.append(select, reply, save); card.append(copy, controls); list.append(card);
  });
  panelNode.append(list); target.append(panelNode);
};

const renderAdminOverview = async (user, target, applications) => {
  const [courses, groups, products, orders, salesLeads, studentRequests, content, activity] = await Promise.all([
    api("/admin/courses"), api("/admin/course-groups"), api("/admin/products"), api("/admin/orders"),
    api("/admin/sales/leads"), api("/admin/student-requests"), api("/admin/site-content"), api("/admin/activity"),
  ]);
  const pendingApplications = applications.filter((item) => ["submitted", "underReview"].includes(item.status));
  const openSales = salesLeads.filter((item) => !["closed"].includes(item.status));
  const openStudentRequests = studentRequests.filter((item) => !["resolved", "closed"].includes(item.status));

  const workPanel = panel("Diqqət gözləyənlər", "Yeni sorğular və idarəetmə addımlarını buradan birbaşa açın.", `${pendingApplications.length + openSales.length + openStudentRequests.length} açıq iş`);
  workPanel.classList.add("wide");
  const workList = document.createElement("div"); workList.className = "cards";
  const addShortcut = (title, detail, count, section) => {
    const item = createItem(title, detail, String(count), count ? "yellow" : "");
    const open = text("button", "Aç", "secondary"); open.type = "button";
    open.addEventListener("click", () => { adminSection = section; void renderAdmin(user); });
    item.append(open); workList.append(item);
  };
  addShortcut("Qeydiyyat təsdiqləri", "Şagird və mentor müraciətlərini təsdiqləyin və ya rədd edin.", pendingApplications.length, "applications");
  addShortcut("Satış müraciətləri", "Səbətdən və sayt çatından gələn proqram sorğuları.", openSales.length, "sales");
  addShortcut("Şagird təklifləri", "Təklif və şikayətlərə status və cavab verin.", openStudentRequests.length, "studentRequests");
  workPanel.append(workList);

  const systemPanel = panel("Sistem göstəriciləri", "Kurs, qrup, satış və sayt məzmununun cari vəziyyəti.");
  systemPanel.classList.add("wide");
  const cards = document.createElement("div"); cards.className = "summary admin-overview-stats";
  [
    ["Kurslar", courses.length, "courses"], ["Aktiv qruplar", groups.filter((item) => item.isActive).length, "groups"],
    ["Satışdakı məhsullar", products.filter((item) => item.isActive).length, "products"], ["Sifarişlər", orders.length, "orders"],
    ["Məzmun blokları", content.length, "content"],
  ].forEach(([label, value, section]) => {
    const card = document.createElement("button"); card.type = "button"; card.className = "stat admin-overview-stat";
    card.append(text("span", label), text("strong", String(value)));
    card.addEventListener("click", () => { adminSection = section; void renderAdmin(user); }); cards.append(card);
  });
  systemPanel.append(cards);

  const activityPanel = panel("Son əməliyyatlar", "İdarəetmə panelində edilən son dəyişikliklər.", `${activity.length} qeyd`);
  activityPanel.classList.add("wide");
  const activityList = document.createElement("div"); activityList.className = "cards";
  if (!activity.length) activityList.append(text("div", "Hələ qeyd olunan əməliyyat yoxdur.", "empty"));
  activity.slice(0, 8).forEach((entry) => {
    const action = ({ "user.status.updated":"Hesab statusu yeniləndi", "group.mentor.assigned":"Mentor qrupa təyin edildi", "group.student.assigned":"Şagird qrupa əlavə edildi" })[entry.action] ?? entry.action;
    const item = createItem(action, `${entry.entityType} · ${new Date(entry.createdAt).toLocaleString("az-AZ")}`, "Qeyd", "blue");
    activityList.append(item);
  });
  activityPanel.append(activityList); target.append(workPanel, systemPanel, activityPanel);
};

const renderAdmin = async (user) => {
  const applications = await api("/admin/role-applications");
  const pending = applications.filter((item) => ["submitted", "underReview"].includes(item.status));
  root.replaceChildren(createHero(user, "Admin paneli", "Coolab idarəetmə mərkəzi", "Qeydiyyatları, tədris proqramlarını, satış məlumatlarını və sayt məzmununu bir yerdən idarə edin."), createSummary([{ label:"Yeni müraciət", value:String(pending.length) }, { label:"Təsdiqlənən", value:String(applications.filter((item) => item.status === "approved").length) }, { label:"Ümumi müraciət", value:String(applications.length) }]));
  root.append(adminTabBar(user));
  const grid=document.createElement("div");grid.className="dashboard-grid admin-grid";root.append(grid);
  if(adminSection==="overview") await renderAdminOverview(user,grid,applications);
  else if(adminSection==="applications") await renderApplications(user,grid);
  else if(adminSection==="people") await renderPeople(grid);
  else if(adminSection==="courses") await renderCourses(grid);
  else if(adminSection==="groups") await renderGroups(grid);
  else if(adminSection==="products") await renderProducts(grid);
  else if(adminSection==="orders") await renderOrders(grid);
  else if(adminSection==="studentRequests") await renderStudentRequests(grid);
  else if(adminSection==="sales") await renderSalesLeads(grid);
  else await renderContent(grid);
};

const renderPortal = async (user) => {
  activeUser = user;
  root.replaceChildren(text("div", "Kabinet yüklənir", "loading"));
  const role = String(user.roles?.[0] ?? "").toLowerCase();
  try {
    if (role === "student") await renderStudent(user);
    else if (role === "mentor") await renderMentor(user);
    else if (role === "admin") await renderAdmin(user);
    else root.replaceChildren(createHero(user, "Coolab hesabı", "Kabinetiniz hazırlanır", "Hesabınız üçün rol təyin edildikdən sonra uyğun bölmələr burada görünəcək."));
  } catch (error) {
    root.replaceChildren(createHero(user, "Coolab hesabı", "Məlumat yüklənmədi", error.message || "Bir qədər sonra yenidən cəhd edin."));
  } finally {
    window.CoolabI18n?.refresh?.();
  }
};

const initialize = async () => {
  const session = readSession();
  if (!session?.accessToken) { window.location.replace("index.html"); return; }
  try {
    const user = await api("/auth/me");
    localStorage.setItem(storageKey, JSON.stringify({ ...session, user }));
    document.querySelector("#mini-name").textContent = `${user.firstName} ${user.lastName}`;
    document.querySelector("#mini-role").textContent = ({ student:"Şagird kabineti", mentor:"Mentor kabineti", admin:"Admin paneli" })[String(user.roles?.[0] ?? "").toLowerCase()] ?? "Coolab kabineti";
    document.querySelector("#avatar").textContent = `${user.firstName?.[0] ?? "C"}${user.lastName?.[0] ?? ""}`.toUpperCase();
    await renderPortal(user);
  } catch { localStorage.removeItem(storageKey); window.location.replace("index.html"); }
};

document.querySelector("#logout-button")?.addEventListener("click", () => { localStorage.removeItem(storageKey); window.location.replace("index.html"); });
document.addEventListener("coolab:localechange", () => {
  if (activeUser) void renderPortal(activeUser);
});
if (apiWakeupPreview) { root.replaceChildren(text("div", "Coolab bağlantı önbaxışı", "loading")); } else { void initialize(); }
