const shopRoot = document.querySelector("#shop-root");
const shopApiBase = window.CoolabApiUrl ?? (window.location.port === "7103" ? `${window.location.origin}/api/v1` : "https://localhost:7103/api/v1");
const shopSessionKey = "coolab.auth";

const readShopSession = () => {
  try { return JSON.parse(localStorage.getItem(shopSessionKey) ?? "null"); }
  catch { return null; }
};
const shopText = (tag, value, className = "") => { const node = document.createElement(tag); node.textContent = value; if (className) node.className = className; return node; };
const shopSource = (value) => window.CoolabI18n?.source?.(value) ?? value;
const shopRequest = async (path, options = {}, requiresAuth = false) => {
  const headers = new Headers(options.headers);
  const session = readShopSession();
  if (requiresAuth) {
    if (!session?.accessToken) throw new Error(shopSource("Səbətdən istifadə etmək üçün hesabınıza daxil olun."));
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }
  if (options.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${shopApiBase}${path}`, { ...options, headers });
  if (!response.ok) { const problem = await response.json().catch(() => null); throw new Error(problem?.detail || problem?.title || shopSource("Sorğu tamamlanmadı.")); }
  return response.status === 204 ? null : response.json();
};
const money = (amount, currency) => new Intl.NumberFormat(({ az:"az-AZ", en:"en-GB", ru:"ru-RU" })[window.CoolabI18n?.locale] ?? "az-AZ", { style:"currency", currency }).format(amount);
const productTypeLabel = (type) => ({ course:"Kurs", event:"Tədbir", physical:"Fiziki məhsul", digital:"Rəqəmsal məhsul" })[type] ?? type;

const renderShop = async () => {
  if (!shopRoot) return;
  shopRoot.replaceChildren(shopText("div", shopSource("Mağaza yüklənir…"), "shop-loading"));
  try {
    const session = readShopSession();
    const [products, cart] = await Promise.all([shopRequest("/shop/products"), session?.accessToken ? shopRequest("/shop/cart", {}, true) : Promise.resolve(null)]);
    const catalogue = document.createElement("div"); catalogue.className = "shop-catalogue";
    if (!products.length) catalogue.append(shopText("div", shopSource("Hazırda satışda məhsul yoxdur."), "shop-empty"));
    products.forEach((product) => {
      const card = document.createElement("article"); card.className = "shop-product";
      card.append(shopText("span", shopSource(productTypeLabel(product.type)), "shop-type"), shopText("h3", product.name), shopText("p", product.description || shopSource("Coolab proqramı və ya məhsulu.")), shopText("strong", money(product.price, product.currency)));
      const stock = product.stockQuantity == null ? shopSource("Qeydiyyat açıqdır") : product.isInStock ? `${product.stockQuantity} ${shopSource("yer qalıb")}` : shopSource("Stokda yoxdur"); card.append(shopText("small", stock));
      const add = shopText("button", session?.accessToken ? shopSource("Səbətə əlavə et") : shopSource("Daxil olun"), "shop-add"); add.type = "button"; add.disabled = !product.isInStock;
      add.addEventListener("click", async () => { if (!session?.accessToken) { window.location.hash = "elaqe"; return; } add.disabled = true; try { await shopRequest("/shop/cart/items", { method:"POST", body:JSON.stringify({ productId:product.id, quantity:1 }) }, true); await renderShop(); } catch (error) { window.alert(error.message); add.disabled = false; } }); card.append(add); catalogue.append(card);
    });
    const cartPanel = document.createElement("aside"); cartPanel.className = "shop-cart"; cartPanel.append(shopText("h3", shopSource("Səbətim")));
    if (!session?.accessToken) cartPanel.append(shopText("p", shopSource("Səbəti yaratmaq və sifarişi izləmək üçün hesabınıza daxil olun.")));
    else if (!cart?.items?.length) cartPanel.append(shopText("p", shopSource("Səbətiniz hələ boşdur.")));
    else {
      const items = document.createElement("div"); items.className = "shop-cart-items";
      cart.items.forEach((item) => { const row = document.createElement("article"); row.append(shopText("strong", item.name), shopText("span", `${item.quantity} × ${money(item.unitPrice, item.currency)}`)); const remove = shopText("button", "×", "shop-remove"); remove.type = "button"; remove.setAttribute("aria-label", shopSource("Səbətdən sil")); remove.addEventListener("click", async () => { await shopRequest(`/shop/cart/items/${item.id}`, { method:"PUT", body:JSON.stringify({ quantity:0 }) }, true); await renderShop(); }); row.append(remove); items.append(row); });
      cartPanel.append(items, shopText("strong", `${shopSource("Cəmi")}: ${money(cart.total, cart.currency)}`, "shop-total"));
      const checkout = shopText("button", shopSource("Təhlükəsiz ödənişə keç"), "shop-checkout"); checkout.type = "button"; checkout.addEventListener("click", async () => { checkout.disabled = true; try { const result = await shopRequest("/shop/checkout", { method:"POST" }, true); if (result.redirectUrl) { window.location.assign(result.redirectUrl); return; } window.alert(`${shopSource("Sifariş")}: ${result.orderNumber}. ${result.nextStep}`); await renderShop(); } catch (error) { window.alert(error.message); checkout.disabled = false; } }); cartPanel.append(checkout);
    }
    shopRoot.replaceChildren(catalogue, cartPanel);
  } catch (error) { shopRoot.replaceChildren(shopText("div", error.message, "shop-empty")); }
};

document.addEventListener("coolab:localechange", () => void renderShop());
void renderShop();
