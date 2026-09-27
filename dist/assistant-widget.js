const apiBase = window.CoolabApiUrl
  ?? (window.location.port === "7103" ? `${window.location.origin}/api/v1` : "https://localhost:7103/api/v1");
const sessionKey = "coolab.assistant.session";
const historyKey = "coolab.assistant.history";

const translate = (value) => window.CoolabI18n?.source?.(value) ?? value;
const getSession = () => {
  const stored = localStorage.getItem(sessionKey);
  if (stored && /^[a-z0-9-]{8,80}$/i.test(stored)) return stored;
  const session = crypto.randomUUID().replaceAll("-", "");
  localStorage.setItem(sessionKey, session);
  return session;
};
const getHistory = () => {
  try { const history = JSON.parse(localStorage.getItem(historyKey) ?? "[]"); return Array.isArray(history) ? history.slice(-12) : []; }
  catch { return []; }
};
const saveHistory = (history) => localStorage.setItem(historyKey, JSON.stringify(history.slice(-12)));

const style = document.createElement("style");
style.textContent = `
  .coolab-assistant{position:fixed;right:24px;bottom:24px;z-index:90;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.coolab-assistant-toggle{display:flex;align-items:center;gap:10px;min-height:56px;padding:0 18px;border:0;border-radius:18px;color:#fff;background:linear-gradient(135deg,#073b70,#087ec4);box-shadow:0 16px 34px rgba(7,59,112,.28);font:800 .86rem/1 inherit;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}.coolab-assistant-toggle:hover{transform:translateY(-3px);box-shadow:0 21px 38px rgba(7,59,112,.34)}.coolab-assistant-symbol{display:grid;width:28px;height:28px;place-items:center;border:1px solid rgba(255,255,255,.62);border-radius:50%;font-size:.9rem}.coolab-assistant-pulse{width:8px;height:8px;border-radius:50%;background:#f7bf27;box-shadow:0 0 0 5px rgba(247,191,39,.16)}.coolab-assistant-panel{position:absolute;right:0;bottom:68px;display:grid;grid-template-rows:auto minmax(190px,1fr) auto;width:min(368px,calc(100vw - 32px));max-height:min(555px,calc(100vh - 118px));overflow:hidden;border:1px solid #c7e4ed;border-radius:24px;background:#fff;box-shadow:0 25px 65px rgba(7,59,112,.28);opacity:0;transform:translateY(14px) scale(.98);pointer-events:none;transition:opacity .2s ease,transform .2s ease}.coolab-assistant.is-open .coolab-assistant-panel{opacity:1;transform:none;pointer-events:auto}.coolab-assistant-head{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:17px 17px 15px;color:#fff;background:radial-gradient(circle at 88% 15%,rgba(16,185,208,.62),transparent 30%),linear-gradient(135deg,#062d5b,#075b91)}.coolab-assistant-head::after{content:"";position:absolute;width:110px;height:110px;right:-52px;bottom:-65px;border:1px solid rgba(255,255,255,.25);border-radius:50%;box-shadow:0 0 0 17px rgba(255,255,255,.05)}.coolab-assistant-head>div{position:relative;z-index:1}.coolab-assistant-head small{display:block;color:#bdebf5;font-size:.64rem;font-weight:900;letter-spacing:.1em}.coolab-assistant-head strong{display:block;margin-top:4px;font-size:1rem}.coolab-assistant-close{position:relative;z-index:1;width:31px;height:31px;border:1px solid rgba(255,255,255,.4);border-radius:10px;color:#fff;background:rgba(255,255,255,.08);font-size:1.1rem;cursor:pointer}.coolab-assistant-messages{display:grid;align-content:start;gap:10px;overflow:auto;padding:15px;background:linear-gradient(180deg,#f7fcfd,#fff)}.coolab-assistant-message{max-width:88%;padding:10px 12px;border-radius:14px 14px 14px 4px;color:#24445e;background:#e8f8fb;font-size:.82rem;line-height:1.48}.coolab-assistant-message.user{justify-self:end;border-radius:14px 14px 4px 14px;color:#fff;background:#087ec4}.coolab-assistant-message.typing{color:#577287;background:#f0f6f9;font-style:italic}.coolab-assistant-shortcuts{display:flex;flex-wrap:wrap;gap:6px;padding:0 15px 10px;background:#fff}.coolab-assistant-shortcuts button{border:1px solid #d7e7ee;border-radius:999px;color:#315b76;background:#fff;padding:6px 9px;font:750 .69rem/1 inherit;cursor:pointer}.coolab-assistant-shortcuts button:hover{border-color:#10b9d0;background:#effcff}.coolab-assistant-form{display:grid;grid-template-columns:1fr auto;gap:8px;padding:12px 14px 14px;border-top:1px solid #e2edf2;background:#fff}.coolab-assistant-form input{min-width:0;min-height:42px;padding:0 12px;border:1px solid #cbdfe8;border-radius:12px;color:#10243c;outline:none;font:inherit;font-size:.8rem}.coolab-assistant-form input:focus{border-color:#10b9d0;box-shadow:0 0 0 3px rgba(16,185,208,.13)}.coolab-assistant-form button{min-width:76px;border:0;border-radius:12px;color:#fff;background:#073b70;font:850 .76rem/1 inherit;cursor:pointer}.coolab-assistant-form button:disabled{opacity:.6;cursor:wait}@media(max-width:600px){.coolab-assistant{right:14px;bottom:14px}.coolab-assistant-toggle{min-height:52px;padding:0 15px}.coolab-assistant-panel{bottom:64px;width:calc(100vw - 28px);max-height:calc(100vh - 95px)}}
`;
document.head.append(style);

const widget = document.createElement("aside");
widget.className = "coolab-assistant";
widget.setAttribute("aria-label", "Coolab AI bələdçisi");
widget.innerHTML = `<section class="coolab-assistant-panel" aria-label="Coolab AI bələdçisi"><header class="coolab-assistant-head"><div><small>COOLAB SİSTEMİ</small><strong>AI bələdçisi</strong></div><button class="coolab-assistant-close" type="button" aria-label="Chatı bağla">×</button></header><div class="coolab-assistant-messages" aria-live="polite"></div><div class="coolab-assistant-shortcuts"><button type="button">Hansı proqram mənə uyğundur?</button><button type="button">Qiymətlər necədir?</button><button type="button">Düşərgə haqqında məlumat</button></div><form class="coolab-assistant-form"><input maxlength="1000" placeholder="Sualınızı yazın…" aria-label="Sualınızı yazın" /><button type="submit">Göndər</button></form></section><button class="coolab-assistant-toggle" type="button" aria-expanded="false"><span class="coolab-assistant-pulse"></span><span class="coolab-assistant-symbol">✦</span><span>AI bələdçisi</span></button>`;
document.body.append(widget);

const panel = widget.querySelector(".coolab-assistant-panel");
const toggle = widget.querySelector(".coolab-assistant-toggle");
const close = widget.querySelector(".coolab-assistant-close");
const messages = widget.querySelector(".coolab-assistant-messages");
const form = widget.querySelector("form");
const input = form.querySelector("input");
const submit = form.querySelector("button");
let history = getHistory();

const addMessage = (content, kind = "assistant", persist = true) => {
  const item = document.createElement("div"); item.className = `coolab-assistant-message${kind === "user" ? " user" : kind === "typing" ? " typing" : ""}`; item.textContent = content; messages.append(item); messages.scrollTop = messages.scrollHeight;
  if (persist && kind !== "typing") { history.push({ content, kind }); saveHistory(history); }
  return item;
};
if (history.length) history.forEach((item) => addMessage(item.content, item.kind, false));
else addMessage("Salam! Proqramlar, fəaliyyətlər, qiymətlər və qəbul barədə sualınızı yaza bilərsiniz.");

const setOpen = (open) => { widget.classList.toggle("is-open", open); toggle.setAttribute("aria-expanded", String(open)); if (open) window.setTimeout(() => input.focus(), 160); };
toggle.addEventListener("click", () => setOpen(!widget.classList.contains("is-open")));
close.addEventListener("click", () => setOpen(false));

const ask = async (value) => {
  const message = value.trim(); if (!message) return;
  addMessage(message, "user"); input.value = ""; submit.disabled = true;
  const typing = addMessage("Cavab hazırlanır…", "typing", false);
  try {
    const response = await fetch(`${apiBase}/sales-chat/messages`, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ sessionId:getSession(), message, locale:window.CoolabI18n?.locale ?? "az" }) });
    const result = await response.json().catch(() => null); typing.remove();
    if (!response.ok) throw new Error(result?.title || "Hazırda cavab vermək mümkün deyil.");
    addMessage(result.reply);
    if (result.showContactForm) addMessage("Ətraflı dəstək üçün ana səhifədəki Əlaqə bölməsindən bizə yaza bilərsiniz.");
  } catch (error) { typing.remove(); addMessage(error.message || "Bağlantı problemi yarandı. Bir qədər sonra yenidən cəhd edin."); }
  finally { submit.disabled = false; input.focus(); }
};
form.addEventListener("submit", (event) => { event.preventDefault(); void ask(input.value); });
widget.querySelectorAll(".coolab-assistant-shortcuts button").forEach((button) => button.addEventListener("click", () => void ask(button.textContent)));
