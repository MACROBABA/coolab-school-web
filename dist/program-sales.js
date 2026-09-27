const catalog = [
  { slug: "robototexnika", sku: "COOLAB-ROBOTICS", name: "Robototexnika", category: "İxtisaslaşma təlimləri", image: "assets/media/robotics.webp", summary: "7 aylıq proqram: həftədə 2 dəfə, hər dərs 2 saat. Elektronika, mexanika və proqramlaşdırma.", facts: ["7 aylıq proqram", "Həftədə 2 dərs · hər dərs 2 saat", "Sensor, LED və robot layihələri"] },
  { slug: "qrafik-dizayn", sku: "COOLAB-DESIGN", name: "Qrafik dizayn", category: "İxtisaslaşma təlimləri", image: "assets/media/design.webp", summary: "4 aylıq proqram: həftədə 2 dəfə, hər dərs 2 saat. Rəng, kompozisiya və vizual hekayə ilə işləyin.", facts: ["4 aylıq proqram", "Həftədə 2 dərs · hər dərs 2 saat", "Real dizayn layihələri və portfolio"] },
  { slug: "ai-telimi", sku: "COOLAB-AI", name: "Süni intellekt təlimi", category: "İxtisaslaşma təlimləri", icon: "✦", summary: "3 aylıq proqram: AI əsasları, araşdırma, ideya yaratma və müasir alətlərdən yaradıcı istifadə.", facts: ["3 aylıq proqram", "AI ilə araşdırma və ideya yaratma", "Müasir alətlərdən məsuliyyətli istifadə"] },
  { slug: "front-end", sku: "COOLAB-FRONTEND", name: "Front-end proqramlaşdırma", category: "İxtisaslaşma təlimləri", icon: "</>", summary: "HTML, CSS və veb məhsul yaratma məntiqini real layihələrlə öyrənin.", facts: ["HTML və CSS əsasları", "İnteraktiv sayt hazırlama", "Şəxsi veb layihə"] },
  { slug: "sosiallasma", sku: "COOLAB-SOCIAL", name: "Sosiallaşma bacarıqları", category: "Sosiallaşma proqramları", image: "assets/media/social.webp", summary: "Hər şənbə 11:00–17:00: mentor saatı, oyunlar, müzakirələr və komanda fəaliyyəti.", facts: ["Hər şənbə · 11:00–17:00", "Mentor dəstəyi və komanda oyunları", "Ünsiyyət və özünüifadə"] },
  { slug: "4-fesil-duserge", sku: "COOLAB-CAMP", name: "4 fəsil düşərgə", category: "Sosiallaşma proqramları", image: "assets/media/camp.webp", summary: "İlboyu təhsil, yaradıcılıq, oyun və sosial təcrübəni birləşdirən düşərgələr.", facts: ["İlin dörd fəslində fərqli təcrübələr", "Yaradıcılıq və komanda fəaliyyətləri", "Yeni dostluqlar və müstəqillik"] },
];

const campVariants = [
  { sku: "COOLAB-CAMP-SPRING", name: "Yaz", days: 3, minimum: 300 },
  { sku: "COOLAB-CAMP-SUMMER", name: "Yay", days: 5, minimum: 450 },
  { sku: "COOLAB-CAMP-AUTUMN", name: "Payız", days: 3, minimum: 300 },
  { sku: "COOLAB-CAMP-WINTER", name: "Qış", days: 3, minimum: 300 },
];
const priceDefaults = new Map([
  ["COOLAB-ROBOTICS", { amount: 128, kind: "monthly" }],
  ["COOLAB-DESIGN", { amount: 125, kind: "monthly" }],
  ["COOLAB-AI", { amount: 200, kind: "monthly" }],
  ["COOLAB-FRONTEND", { amount: 150, kind: "monthly" }],
  ["COOLAB-SOCIAL", { amount: 150, kind: "starting" }],
  ...campVariants.map((season) => [season.sku, { amount: season.minimum, kind: "starting" }]),
]);

const cartKey = "coolab.program.cart.v1";
const apiBase = window.CoolabApiUrl ?? (window.location.port === "7103" ? `${window.location.origin}/api/v1` : "https://localhost:7103/api/v1");
const translate = (value) => window.CoolabI18n?.source?.(value) ?? value;
const bySku = new Map(catalog.map((program) => [program.sku, program]));
campVariants.forEach((season) => bySku.set(season.sku, { ...catalog.find((program) => program.sku === "COOLAB-CAMP"), season }));
let liveProducts = new Map();
let productsLoaded = false;
let toastTimer;

const create = (tag, className, value) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value != null) node.textContent = translate(value);
  return node;
};

const readCart = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(cartKey) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter((item) => bySku.has(item?.sku) && item.sku !== "COOLAB-CAMP" && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 20).slice(0, 10);
  } catch { return []; }
};

const saveCart = (items) => {
  localStorage.setItem(cartKey, JSON.stringify(items));
  updateCartCount();
  renderCart();
};

const updateCartCount = () => {
  const count = readCart().reduce((total, item) => total + item.quantity, 0);
  document.querySelectorAll("[data-cart-count]").forEach((node) => { node.textContent = String(count); });
};

const priceOf = (sku) => {
  if (sku === "COOLAB-CAMP") {
    const prices = campVariants.map((season) => priceOf(season.sku)).filter((value) => value != null);
    return prices.length ? Math.min(...prices) : null;
  }
  const product = liveProducts.get(sku);
  if (product) return typeof product.price === "number" && product.price > 0 ? product.price : null;
  return productsLoaded ? null : priceDefaults.get(sku)?.amount ?? null;
};

const currencyOf = (sku) => liveProducts.get(sku)?.currency ?? "AZN";
const money = (amount, currency = "AZN") => `${new Intl.NumberFormat(({ az: "az-AZ", en: "en-GB", ru: "ru-RU" })[window.CoolabI18n?.locale] ?? "az-AZ", { maximumFractionDigits: 2 }).format(amount)} ${currency}`;
const priceLabel = (sku) => {
  const amount = priceOf(sku);
  if (amount == null) return translate("Qiymət tezliklə");
  const formatted = money(amount, currencyOf(sku));
  if (priceDefaults.get(sku)?.kind === "monthly") return `${formatted}/${translate("ay")}`;
  if (sku === "COOLAB-CAMP" || priceDefaults.get(sku)?.kind === "starting") {
    const language = window.CoolabI18n?.locale ?? "az";
    return language === "en" ? `from ${formatted}` : language === "ru" ? `от ${formatted}` : `${formatted}-dən`;
  }
  return formatted;
};
const durationLabel = (days) => window.CoolabI18n?.locale === "ru"
  ? `${days} ${days === 3 ? "дня" : "дней"}`
  : `${days} ${translate("gün")}`;
const isAvailable = (sku) => !productsLoaded || liveProducts.get(sku)?.isInStock === true;

const updatePrices = () => {
  document.querySelectorAll("[data-price-sku]").forEach((node) => { node.textContent = priceLabel(node.dataset.priceSku); });
  document.querySelectorAll("[data-season-price-sku]").forEach((node) => {
    const season = campVariants.find((item) => item.sku === node.dataset.seasonPriceSku);
    if (season) node.textContent = `${translate(season.name)} · ${durationLabel(season.days)} — ${priceLabel(season.sku)}`;
  });
  document.querySelectorAll("[data-add-sku]").forEach((button) => {
    const available = (!button.dataset.requiresSelection || !!button.dataset.addSku) && isAvailable(button.dataset.addSku);
    button.disabled = !available;
    button.textContent = button.dataset.requiresSelection && !button.dataset.addSku ? translate("Əvvəl fəsli seçin") : available ? translate(button.closest(".sales-detail") ? "Səbətə əlavə et →" : "Səbətə əlavə et") : translate("Yer yoxdur");
  });
};

const showToast = () => {
  let toast = document.querySelector("#sales-toast");
  if (!toast) {
    toast = create("div", "sales-toast");
    toast.id = "sales-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.append(toast);
  }
  toast.replaceChildren(create("span", "", "Proqram səbətə əlavə edildi."));
  const link = create("a", "", "Səbətə bax →");
  link.href = "sebet.html";
  toast.append(link);
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
};

const addToCart = (sku) => {
  if (!bySku.has(sku) || !isAvailable(sku)) return;
  const cart = readCart();
  const existing = cart.find((item) => item.sku === sku);
  if (existing) existing.quantity = Math.min(existing.quantity + 1, 20);
  else cart.push({ sku, quantity: 1 });
  saveCart(cart);
  showToast();
};

const setQuantity = (sku, quantity) => {
  const cart = readCart().filter((item) => item.sku !== sku);
  if (quantity > 0 && quantity <= 20) cart.push({ sku, quantity });
  saveCart(cart);
};

const renderDetail = () => {
  const root = document.querySelector("#program-detail");
  if (!root) return;
  const slug = new URLSearchParams(window.location.search).get("slug");
  const program = catalog.find((item) => item.slug === slug);
  if (!program) {
    const missing = create("section", "sales-empty");
    missing.append(create("h1", "", "Proqram tapılmadı."), create("p", "", "Bütün proqramlara qayıdıb seçim edin."));
    const back = create("a", "sales-secondary", "Proqramlara bax →"); back.href = "index.html#haqqimizda"; missing.append(back);
    root.replaceChildren(missing);
    return;
  }

  document.title = `${translate(program.name)} — Coolab School`;
  const hero = create("section", "sales-detail");
  const visual = create("div", "sales-visual");
  if (program.image) {
    const image = create("img"); image.src = program.image; image.alt = translate(program.name); image.decoding = "async";
    visual.append(image);
  } else {
    visual.classList.add("sales-visual--graphic");
    visual.append(create("span", "sales-visual-icon", program.icon));
  }
  visual.append(create("span", "sales-visual-badge", program.category));
  const copy = create("div", "sales-detail-copy");
  copy.append(create("span", "sales-eyebrow", program.category), create("h1", "", program.name), create("p", "", program.summary));
  const facts = create("ul", "sales-facts");
  program.facts.forEach((fact) => facts.append(create("li", "", fact)));
  const purchase = create("div", "sales-purchase");
  const priceBlock = create("div", "sales-price-block");
  const price = create("strong", "", priceLabel(program.sku)); price.dataset.priceSku = program.sku;
  priceBlock.append(create("span", "", program.sku === "COOLAB-CAMP" || program.sku === "COOLAB-SOCIAL" ? "Başlanğıc qiymət" : priceDefaults.get(program.sku)?.kind === "monthly" ? "Aylıq qiymət" : "Proqramın qiyməti"), price);
  const actions = create("div", "sales-actions");
  const add = create("button", "sales-primary", "Səbətə əlavə et →"); add.type = "button"; add.dataset.addSku = program.sku;
  const cart = create("a", "sales-secondary", "Səbətə bax"); cart.href = "sebet.html";
  actions.append(add, cart);
  purchase.append(priceBlock);
  if (program.sku === "COOLAB-CAMP") {
    add.dataset.addSku = "";
    add.dataset.requiresSelection = "true";
    const choices = create("fieldset", "sales-season-selector");
    choices.append(create("legend", "", "Düşərgə fəslini seçin"));
    const grid = create("div", "sales-season-grid");
    campVariants.forEach((season) => {
      const label = create("label", "sales-season-option");
      const radio = create("input"); radio.type = "radio"; radio.name = "camp-season"; radio.value = season.sku;
      radio.addEventListener("change", () => { add.dataset.addSku = season.sku; price.dataset.priceSku = season.sku; updatePrices(); });
      const name = create("strong", "", season.name);
      const details = create("span", "", durationLabel(season.days));
      const amount = create("b", "", priceLabel(season.sku)); amount.dataset.priceSku = season.sku;
      label.append(radio, name, details, amount); grid.append(label);
    });
    choices.append(grid); purchase.append(choices);
  }
  purchase.append(actions, create("small", "", "Səbətdən müraciət göndərin. Yekun qiyməti komandamız sizinlə təsdiqləyəcək."));
  copy.append(purchase, facts);
  hero.append(visual, copy);
  root.replaceChildren(hero);

  const related = document.querySelector("#related-programs");
  if (related) {
    related.replaceChildren();
    catalog.filter((item) => item.sku !== program.sku).slice(0, 3).forEach((item) => {
      const link = create("a", "sales-related-card"); link.href = `proqram.html?slug=${encodeURIComponent(item.slug)}`;
      const relatedImage = item.image ? create("img") : create("span", "sales-related-icon", item.icon);
      if (item.image) { relatedImage.src = item.image; relatedImage.alt = ""; relatedImage.loading = "lazy"; }
      const body = create("span"); body.append(create("strong", "", item.name));
      const relatedPrice = create("small", "", priceLabel(item.sku)); relatedPrice.dataset.priceSku = item.sku; body.append(relatedPrice);
      link.append(relatedImage, body); related.append(link);
    });
  }
};

const renderCart = () => {
  const root = document.querySelector("#cart-items");
  if (!root) return;
  const cart = readCart();
  const requestSection = document.querySelector("#request-section");
  if (requestSection) requestSection.hidden = cart.length === 0;
  root.replaceChildren();

  if (!cart.length) {
    const empty = create("div", "sales-empty");
    empty.append(create("h2", "", "Səbətiniz hələ boşdur."), create("p", "", "İstədiyiniz proqramı seçib səbətə əlavə edin."));
    const back = create("a", "sales-primary", "Proqramlara bax →"); back.href = "index.html#haqqimizda"; empty.append(back); root.append(empty);
  }

  cart.forEach(({ sku, quantity }) => {
    const program = bySku.get(sku);
    const row = create("article", "sales-cart-item");
    const image = program.image ? create("img") : create("span", "sales-cart-icon", program.icon);
    if (program.image) { image.src = program.image; image.alt = ""; image.loading = "lazy"; }
    const info = create("div");
    const title = create("h3"); const link = create("a", "", program.name); link.href = `proqram.html?slug=${encodeURIComponent(program.slug)}`; title.append(link);
    const subtitle = create("p", "", program.season ? `${translate(program.season.name)} · ${durationLabel(program.season.days)}` : program.category);
    const rowPrice = create("strong", "", priceLabel(sku)); rowPrice.dataset.priceSku = sku;
    info.append(title, subtitle, rowPrice);
    const controls = create("div", "sales-cart-controls");
    const stepper = create("div", "sales-quantity");
    const minus = create("button", "", "−"); minus.type = "button"; minus.setAttribute("aria-label", `${translate(program.name)}: ${translate("Miqdarı azalt")}`); minus.addEventListener("click", () => setQuantity(sku, quantity - 1));
    const count = create("span", "", String(quantity));
    const plus = create("button", "", "+"); plus.type = "button"; plus.setAttribute("aria-label", `${translate(program.name)}: ${translate("Miqdarı artır")}`); plus.disabled = quantity >= 20; plus.addEventListener("click", () => setQuantity(sku, quantity + 1));
    stepper.append(minus, count, plus);
    const remove = create("button", "sales-remove", "Səbətdən sil"); remove.type = "button"; remove.addEventListener("click", () => setQuantity(sku, 0));
    controls.append(stepper, remove); row.append(image, info, controls); root.append(row);
  });

  const summary = document.querySelector("#cart-summary");
  if (summary) {
    summary.replaceChildren();
    const quantity = cart.reduce((total, item) => total + item.quantity, 0);
    const qtyRow = create("div", "sales-summary-row"); qtyRow.append(create("span", "", "Seçilən proqram sayı"), create("strong", "", String(quantity)));
    const totalRow = create("div", "sales-summary-row");
    totalRow.append(create("span", "", "Yekun qiymət"), create("strong", "", "Müraciətdən sonra"));
    summary.append(qtyRow, totalRow);
  }
};

const submitRequest = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = document.querySelector("#request-feedback");
  const cart = readCart();
  if (!cart.length) return;
  const button = form.querySelector("button[type='submit']");
  const data = new FormData(form);
  const payload = {
    fullName: String(data.get("fullName") ?? "").trim(),
    contact: String(data.get("contact") ?? "").trim(),
    childAge: data.get("childAge") ? Number(data.get("childAge")) : null,
    consentToContact: data.get("consentToContact") === "on",
    items: cart.map((item) => ({ sku: item.sku, quantity: item.quantity })),
  };
  button.disabled = true;
  feedback.classList.remove("is-error");
  feedback.textContent = translate("Müraciət göndərilir…");
  try {
    const response = await fetch(`${apiBase}/shop/requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.detail || result?.title || translate("Müraciət göndərilə bilmədi."));
    saveCart([]);
    const done = create("div", "sales-success");
    done.append(create("h2", "", "Müraciətiniz qəbul edildi."), create("p", "", "Komandamız proqram seçiminizə baxıb sizinlə əlaqə saxlayacaq."));
    const link = create("a", "sales-secondary", "Proqramlara qayıt →"); link.href = "index.html#haqqimizda"; done.append(link);
    const section = document.querySelector("#request-section"); section.replaceChildren(done); section.hidden = false;
  } catch (error) {
    feedback.classList.add("is-error");
    feedback.textContent = error.message || translate("Müraciət göndərilə bilmədi.");
    button.disabled = false;
  }
};

document.addEventListener("click", (event) => {
  const add = event.target.closest("[data-add-sku]");
  if (add) addToCart(add.dataset.addSku);
});
document.querySelector("#program-request-form")?.addEventListener("submit", submitRequest);
document.addEventListener("coolab:localechange", () => { renderDetail(); renderCart(); updatePrices(); updateCartCount(); });
window.addEventListener("storage", (event) => { if (event.key === cartKey) { updateCartCount(); renderCart(); } });

updateCartCount();
renderDetail();
renderCart();
updatePrices();
fetch(`${apiBase}/shop/products`)
  .then((response) => { if (!response.ok) throw new Error("Product catalogue unavailable"); return response.json(); })
  .then((products) => { productsLoaded = true; liveProducts = new Map(products.map((product) => [product.sku, product])); updatePrices(); renderCart(); })
  .catch(() => {});
