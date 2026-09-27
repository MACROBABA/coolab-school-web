const apiBase = window.CoolabApiUrl
  ?? (window.location.port === "7103" ? `${window.location.origin}/api/v1` : "https://localhost:7103/api/v1");

const applyText = (selector, value) => {
  if (!value) return;
  document.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
};

const loadAzerbaijaniContent = async () => {
  if (window.CoolabI18n?.locale !== "az") return;
  try {
    const response = await fetch(`${apiBase}/site-content`);
    if (!response.ok) return;
    const entries = await response.json();
    entries.forEach((entry) => {
      applyText(`[data-content-title="${CSS.escape(entry.key)}"]`, entry.title);
      applyText(`[data-content-body="${CSS.escape(entry.key)}"]`, entry.body);
    });
  } catch {
    // The page keeps its built-in content if the local API is offline.
  }
};

document.addEventListener("coolab:localechange", () => {
  if (window.CoolabI18n?.locale === "az") void loadAzerbaijaniContent();
  else window.location.reload();
});

void loadAzerbaijaniContent();
