const modal = document.querySelector("#auth-modal");
const registerForm = document.querySelector("#register-form");
const loginForm = document.querySelector("#login-form");
const passwordRecoveryForm = document.querySelector("#password-recovery-form");
const passwordResetForm = document.querySelector("#password-reset-form");
const feedback = document.querySelector("#auth-feedback");
const accountPanel = document.querySelector("#account-panel");
const title = document.querySelector("#auth-title");
const description = document.querySelector("#auth-description");
const authTabs = document.querySelector(".auth-tabs");
const storageKey = "coolab.auth";

const apiBase = window.CoolabApiUrl
  ?? (window.location.port === "7103"
    ? `${window.location.origin}/api/v1`
    : "https://localhost:7103/api/v1");
const passwordInput = document.querySelector("#register-password");
const passwordMeter = document.querySelector("#password-strength");
const passwordHint = document.querySelector("#password-note");
const t = (key, fallback) => window.CoolabI18n?.t(key, fallback) ?? fallback;
const s = (fallback) => window.CoolabI18n?.source?.(fallback) ?? fallback;
let activeAuthTab = "register";

const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? "null");
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
};

const setFeedback = (message = "", type = "") => {
  feedback.textContent = message;
  feedback.className = `auth-feedback${type ? ` is-${type}` : ""}`;
};

const setActionFeedback = (message, actionUrl = null, actionLabel = "Test üçün e-poçt təsdiqini tamamla →") => {
  setFeedback(message, "success");
  if (!actionUrl) return;
  const link = document.createElement("a");
  link.href = actionUrl;
  link.textContent = s(actionLabel);
  link.className = "auth-verification-link";
  feedback.append(document.createElement("br"), link);
};

const updatePasswordStrength = () => {
  if (!passwordInput || !passwordMeter || !passwordHint) return;
  const value = passwordInput.value;
  const checks = [
    value.length >= 12,
    /[a-z]/.test(value) && /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ];
  const level = checks.filter(Boolean).length;
  passwordMeter.dataset.level = String(level);
  passwordHint.textContent = !value
    ? s("Ən azı 12 simvol, böyük və kiçik hərf, rəqəm və xüsusi işarə.")
    : s(["Şifrəni bir az da gücləndirin.", "Yaxşı başlanğıcdır — rəqəm və işarə əlavə edin.", "Güclü şifrədir.", "Əla — şifrəniz kifayət qədər güclüdür."][Math.max(level - 1, 0)]);
};

const formatProblem = async (response) => {
  const problem = await response.json().catch(() => null);
  if (!problem) return "Bağlantı zamanı xəta baş verdi. Yenidən cəhd edin.";
  if (problem.errors) {
    const firstGroup = Object.values(problem.errors).find((value) => Array.isArray(value) && value.length);
    if (firstGroup) return firstGroup[0];
  }
  return problem.detail || problem.title || "Sorğu tamamlanmadı.";
};

const request = async (path, options = {}) => {
  const session = readSession();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  return fetch(`${apiBase}${path}`, { ...options, headers });
};

const googleButtons = [...document.querySelectorAll("[data-google-auth]")];
let googleAvailable = false;

const loadAuthenticationProviders = async () => {
  try {
    const response = await request("/auth/providers");
    const providers = response.ok ? await response.json() : {};
    googleAvailable = providers.google === true;
  } catch {
    googleAvailable = false;
  }
  googleButtons.forEach((button) => {
    button.disabled = !googleAvailable;
    button.title = googleAvailable ? s("Google hesabınızla davam edin") : s("Google ilə giriş hələ tənzimlənməyib");
  });
};

const roleLabel = (roles = []) => ({
  student: s("Şagird hesabı"),
  mentor: s("Mentor hesabı"),
  administrator: s("Administrator hesabı"),
}[String(roles[0] ?? "").toLowerCase()] ?? s("Coolab hesabı"));

const showAccount = async (user) => {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.classList.remove("is-active");
    button.setAttribute("aria-selected", "false");
  });
  registerForm.hidden = true;
  loginForm.hidden = true;
  accountPanel.hidden = false;
  title.textContent = s("Şəxsi kabinet");
  description.textContent = s("Hesab məlumatlarınız və sizə açıq olan bölmələr burada görünəcək.");
  document.querySelector("#account-name").textContent = `${user.firstName} ${user.lastName}`;
  document.querySelector("#account-role").textContent = roleLabel(user.roles);

  const role = String(user.roles?.[0] ?? "").toLowerCase();
  const dashboardPath = {
    student: "/student/dashboard",
    mentor: "/mentor/course-groups",
  }[role];
  const content = document.querySelector("#account-content");
  if (!dashboardPath) {
    content.textContent = s("Administrator funksiyaları növbəti mərhələdə əlavə olunacaq.");
    return;
  }

  content.textContent = s("Kabinet məlumatları yüklənir…");
  const response = await request(dashboardPath);
  if (!response.ok) {
    content.textContent = s("Kabinetiniz hazırdır. Məlumatlar əlavə olunduqca burada görünəcək.");
    return;
  }
  const data = await response.json();
  if (role === "student") {
    content.textContent = `${data.enrollments?.length ?? 0} ${s("aktiv proqram")} və ${data.games?.length ?? 0} ${s("oyun nəticəsi var.")}`;
  } else {
    content.textContent = `${data.length ?? 0} ${s("qrup və dərs idarəetmə bölməsi sizə açıqdır.")}`;
  }
};

const selectTab = (name) => {
  activeAuthTab = name;
  const isAccount = name === "account";
  const isRecovery = name === "recovery";
  const isReset = name === "reset";
  const isStandardTab = name === "register" || name === "login";
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    const active = button.dataset.authTab === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  if (authTabs) authTabs.hidden = !isStandardTab;
  registerForm.hidden = name !== "register";
  loginForm.hidden = name !== "login";
  passwordRecoveryForm.hidden = !isRecovery;
  passwordResetForm.hidden = !isReset;
  accountPanel.hidden = !isAccount;
  if (!isAccount) {
    title.textContent = isRecovery
      ? s("Şifrəni bərpa et")
      : isReset
        ? s("Yeni şifrə yarat")
        : name === "login"
          ? t("auth.title.login", "Hesabına daxil ol")
          : t("auth.title.register", "Coolab-a qoşul");
    description.textContent = isRecovery
      ? s("Şifrə yeniləmə linkini təhlükəsiz şəkildə e-poçtunuza göndərək.")
      : isReset
        ? s("Yeni şifrə yalnız bu hesab üçün tətbiq olunacaq.")
        : name === "login"
          ? t("auth.description.login", "Şəxsi kabinetinə keçmək üçün məlumatlarını daxil et.")
          : t("auth.description.register", "Şagird və ya mentor kimi müraciətini göndər.");
  }
  setFeedback();
};

const openModal = (tab = "register") => {
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add("is-open"));
  document.body.style.overflow = "hidden";
  const session = readSession();
  const isSensitiveFlow = tab === "recovery" || tab === "reset";
  if (session?.user && !isSensitiveFlow) {
    showAccount(session.user).catch(() => setFeedback("Kabinet məlumatı yüklənmədi.", "error"));
  } else {
    selectTab(tab);
    const form = tab === "login" ? loginForm : tab === "recovery" ? passwordRecoveryForm : tab === "reset" ? passwordResetForm : registerForm;
    form?.querySelector("input:not([type='hidden'])")?.focus();
  }
};

const closeModal = () => {
  modal.classList.remove("is-open");
  window.setTimeout(() => { modal.hidden = true; }, 220);
  document.body.style.overflow = "";
};

document.querySelectorAll("[data-auth-open]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.authOpen));
});
document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => selectTab(button.dataset.authTab));
});
document.querySelector("[data-auth-forgot]")?.addEventListener("click", () => selectTab("recovery"));
document.querySelector("[data-auth-close]")?.addEventListener("click", closeModal);
modal?.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.hidden) closeModal();
});

document.addEventListener("coolab:localechange", () => {
  if (modal?.hidden) return;
  if (!accountPanel?.hidden) {
    const user = readSession()?.user;
    if (user) void showAccount(user);
    return;
  }
  selectTab(activeAuthTab);
});

passwordInput?.addEventListener("input", updatePasswordStrength);
document.querySelectorAll("[data-password-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.querySelector(`#${button.dataset.passwordToggle}`);
    if (!input) return;
    const shouldShow = input.type === "password";
    input.type = shouldShow ? "text" : "password";
    button.classList.toggle("is-visible", shouldShow);
    button.setAttribute("aria-label", s(shouldShow ? "Şifrəni gizlət" : "Şifrəni göstər"));
  });
});

googleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!googleAvailable) {
      setFeedback(s("Google ilə giriş hələ aktivləşdirilməyib."), "error");
      return;
    }
    const selectedRole = registerForm.querySelector("input[name='requestedRole']:checked")?.value ?? "student";
    const query = new URLSearchParams({ requestedRole: selectedRole });
    window.location.assign(`${apiBase}/auth/google?${query}`);
  });
});

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = registerForm.querySelector("button[type='submit']");
  const values = Object.fromEntries(new FormData(registerForm));
  button.disabled = true;
  setFeedback(s("Müraciət göndərilir…"));
  try {
    const response = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify(values),
    });
    if (!response.ok) throw new Error(await formatProblem(response));
    const result = await response.json();
    registerForm.reset();
    updatePasswordStrength();
    setActionFeedback(result.message ?? s("Müraciətiniz qəbul edildi."), result.developmentVerificationUrl);
  } catch (error) {
    setFeedback(error.message || s("Müraciət göndərilmədi."), "error");
  } finally {
    button.disabled = false;
  }
});

passwordRecoveryForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = passwordRecoveryForm.querySelector("button[type='submit']");
  const { email } = Object.fromEntries(new FormData(passwordRecoveryForm));
  button.disabled = true;
  setFeedback(s("Yeniləmə linki hazırlanır…"));
  try {
    const response = await request("/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error(await formatProblem(response));
    const result = await response.json();
    setActionFeedback(
      result.message ?? s("Bu e-poçtla hesab varsa, şifrə yeniləmə linki göndərildi."),
      result.developmentResetUrl,
      "Test üçün şifrə yeniləmə səhifəsini aç →"
    );
  } catch (error) {
    setFeedback(error.message || s("Yeniləmə linki göndərilmədi."), "error");
  } finally {
    button.disabled = false;
  }
});

document.querySelector("[data-auth-resend-confirmation]")?.addEventListener("click", async () => {
  const email = passwordRecoveryForm?.elements.email?.value?.trim();
  if (!email) {
    passwordRecoveryForm?.elements.email?.focus();
    setFeedback(s("Əvvəl e-poçt ünvanınızı yazın."), "error");
    return;
  }

  const button = document.querySelector("[data-auth-resend-confirmation]");
  button.disabled = true;
  setFeedback(s("Təsdiq e-poçtu göndərilir…"));
  try {
    const response = await request("/auth/email/resend-confirmation", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error(await formatProblem(response));
    const result = await response.json();
    setActionFeedback(result.message, result.developmentVerificationUrl);
  } catch (error) {
    setFeedback(error.message || s("Təsdiq e-poçtu göndərilmədi."), "error");
  } finally {
    button.disabled = false;
  }
});

passwordResetForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = passwordResetForm.querySelector("button[type='submit']");
  const values = Object.fromEntries(new FormData(passwordResetForm));
  if (values.password !== values.passwordConfirmation) {
    setFeedback(s("Şifrələr eyni deyil."), "error");
    return;
  }

  button.disabled = true;
  setFeedback(s("Şifrəniz yenilənir…"));
  try {
    const response = await request("/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ userId: values.userId, token: values.token, password: values.password }),
    });
    if (!response.ok) throw new Error(await formatProblem(response));
    passwordResetForm.reset();
    selectTab("login");
    setFeedback(s("Şifrəniz yeniləndi. Yeni şifrə ilə daxil ola bilərsiniz."), "success");
  } catch (error) {
    setFeedback(error.message || s("Şifrə yenilənmədi."), "error");
  } finally {
    button.disabled = false;
  }
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button[type='submit']");
  const values = Object.fromEntries(new FormData(loginForm));
  button.disabled = true;
  setFeedback(s("Hesab yoxlanılır…"));
  try {
    const response = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify(values),
    });
    if (!response.ok) throw new Error(await formatProblem(response));
    const result = await response.json();
    localStorage.setItem(storageKey, JSON.stringify({ accessToken: result.accessToken, expiresAt: result.expiresAt, user: result.user }));
    window.dispatchEvent(new Event("coolab:authchange"));
    if (result.user.roles?.some((role) => ["admin", "mentor", "student"].includes(String(role).toLowerCase()))) {
      window.location.assign("portal.html");
      return;
    }
    setFeedback();
    await showAccount(result.user);
  } catch (error) {
    setFeedback(error.message || s("Giriş alınmadı."), "error");
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#logout-button")?.addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  window.dispatchEvent(new Event("coolab:authchange"));
  selectTab("login");
  setFeedback(s("Hesabdan çıxış edildi."), "success");
});

document.querySelector("#open-portal-button")?.addEventListener("click", () => {
  window.location.assign("portal.html");
});

const consumeAuthRedirect = async () => {
  const currentUrl = new URL(window.location.href);
  const status = currentUrl.searchParams.get("auth");
  const hashParameters = new URLSearchParams(currentUrl.hash.slice(1));
  const accessToken = hashParameters.get("coolab_token");
  const resetUserId = hashParameters.get("reset_user");
  const resetToken = hashParameters.get("reset_token");
  if (!status && !accessToken) return;

  currentUrl.searchParams.delete("auth");
  currentUrl.hash = "";
  window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}`);

  if (status === "password-reset") {
    if (!resetUserId || !resetToken || !passwordResetForm) {
      openModal("login");
      setFeedback(s("Şifrə yeniləmə linki etibarlı deyil və ya vaxtı bitib."), "error");
      return;
    }
    passwordResetForm.elements.userId.value = resetUserId;
    passwordResetForm.elements.token.value = resetToken;
    openModal("reset");
    setFeedback(s("Yeni şifrənizi yaradın."));
    return;
  }

  if (accessToken) {
    localStorage.setItem(storageKey, JSON.stringify({ accessToken }));
    try {
      const response = await request("/auth/me");
      if (!response.ok) throw new Error();
      const user = await response.json();
      localStorage.setItem(storageKey, JSON.stringify({ accessToken, user }));
      window.dispatchEvent(new Event("coolab:authchange"));
      if (user.roles?.some((role) => ["admin", "mentor", "student"].includes(String(role).toLowerCase()))) {
        window.location.assign("portal.html");
        return;
      }
      openModal("login");
      await showAccount(user);
      setFeedback("Google hesabınızla uğurla daxil oldunuz.", "success");
      return;
    } catch {
      localStorage.removeItem(storageKey);
      openModal("login");
      setFeedback("Google girişini tamamlamaq mümkün olmadı. Yenidən cəhd edin.", "error");
      return;
    }
  }

  const messages = {
    "admin-login": "Admin panelinə keçmək üçün daxil olun.",
    "google-pending": "Google hesabınızla müraciət qəbul edildi. Administrator təsdiqini gözləyin.",
    "google-rejected": "Bu hesab üçün müraciət təsdiqlənməyib.",
    "google-suspended": "Bu hesab müvəqqəti dayandırılıb.",
    "google-email-required": "Google hesabınızın e-poçt məlumatı tələb olunur.",
    "google-role-invalid": "Hesab növü seçimi etibarlı deyil.",
    "google-registration-failed": "Google hesabı ilə qeydiyyat tamamlanmadı.",
    "google-link-failed": "Google hesabı ilə əlaqə qurula bilmədi.",
    "google-failed": "Google girişi tamamlanmadı.",
    "email-confirmed": "E-poçt ünvanınız təsdiqləndi. İndi administrator müraciətinizi nəzərdən keçirəcək.",
    "email-confirmation-invalid": "E-poçt təsdiq linki etibarlı deyil və ya vaxtı bitib.",
  };
  openModal("login");
  setFeedback(messages[status] ?? "Giriş tamamlanmadı.", status === "admin-login" ? "" : status === "email-confirmed" ? "success" : "error");
};

void loadAuthenticationProviders();
void consumeAuthRedirect();
