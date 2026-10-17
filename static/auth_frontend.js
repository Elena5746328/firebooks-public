"use strict";

// FIREBOOKS — настоящая авторизация через FastAPI и SQLite.
// Этот файл подключается ПОСЛЕ script.js.

let authUser = null;
let authReady = false;

// ─── Обновление интерфейса пользователя ────────────────────

function syncAuthUI() {
  const trigger =
    document.getElementById("user-menu") ||
    document.getElementById("login-trigger");

  if (trigger) {
    if (authUser) {
      trigger.id = "user-menu";
      trigger.href = "/profile";

      trigger.classList.remove("nav__link--login");
      trigger.classList.add("nav__link--user");

      trigger.textContent = authUser.name;
    } else {
      trigger.id = "login-trigger";
      trigger.href = "#";

      trigger.classList.remove("nav__link--user");
      trigger.classList.add("nav__link--login");

      trigger.textContent = "Войти";
    }
  }

  const name = authUser?.name || "Гость";

  document.querySelectorAll(".sidebar__name").forEach(element => {
    element.textContent = name;
  });

  document.querySelectorAll(".sidebar__avatar").forEach(element => {
    element.textContent = name.charAt(0).toUpperCase();
  });

  const values = {
    "profile-name": name,
    "profile-surname": authUser?.surname || "",
    "profile-phone": authUser?.phone || "—",
    "profile-email": authUser?.email || "—",
    "profile-avatar-letter": name.charAt(0).toUpperCase()
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  });

  const surnameRow =
    document.getElementById("profile-surname-item");

  if (surnameRow) {
    surnameRow.style.display =
      authUser?.surname ? "" : "none";
  }

  const logoutButton =
    document.getElementById("logout-btn");

  if (logoutButton) {
    logoutButton.hidden = !authUser;
  }

  document.dispatchEvent(
    new CustomEvent("firebooks:auth-changed", {
      detail: { user: authUser }
    })
  );
}

// ─── Запросы к серверу ──────────────────────────────────────

async function authRequest(path, payload) {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.detail === "string"
        ? data.detail
        : "Проверьте введённые данные";

    throw new Error(message);
  }

  return data;
}

// ─── Проверка текущей сессии ────────────────────────────────

async function refreshAuth() {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Не удалось проверить вход");
    }

    const data = await response.json();

    authUser = data.user || null;
  } catch (error) {
    console.error("Проверка авторизации:", error);
    authUser = null;
  } finally {
    authReady = true;
    syncAuthUI();
  }
}

// ─── Регистрация и вход ─────────────────────────────────────

function initRealAuthentication() {
  const loginModal =
    document.getElementById("login-modal");

  const registerModal =
    document.getElementById("register-modal");

  const loginForm =
    document.getElementById("login-form");

  const registerForm =
    document.getElementById("register-form");

  // Открытие и закрытие окон

  document.addEventListener("click", event => {
    if (event.target.closest("#login-trigger")) {
      event.preventDefault();

      if (authUser) {
        window.location.href = "/profile";
      } else {
        openModal(loginModal);
      }

      return;
    }

    if (event.target.closest("#user-menu")) {
      event.preventDefault();
      window.location.href = "/profile";
      return;
    }

    if (event.target.closest(".modal__register-link")) {
      event.preventDefault();

      closeModal(loginModal);openModal(registerModal);
      return;
    }

    if (event.target.closest(".modal__login-link")) {
      event.preventDefault();

      closeModal(registerModal);
      openModal(loginModal);
      return;
    }

    if (event.target.closest("#modal-close")) {
      closeModal(loginModal);
      return;
    }

    if (event.target.closest("#register-close")) {
      closeModal(registerModal);
      return;
    }

    if (event.target.closest(".modal__forgot")) {
      event.preventDefault();

      alert(
        "Восстановление пароля пока не подключено."
      );
    }
  });

  // Закрытие по Escape

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeModal(loginModal);
      closeModal(registerModal);
    }
  });

  // Общая функция отправки формы

  async function submitForm(form, path, payload) {
    const button =
      form.querySelector('button[type="submit"]');

    if (button) {
      button.disabled = true;
    }

    try {
      const data = await authRequest(path, payload);

      authUser = data.user;

      syncAuthUI();

      closeModal(
        path === "login"
          ? loginModal
          : registerModal
      );

      form.reset();

      window.location.href = "/profile";
    } catch (error) {
      alert(error.message);
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }

  // ─── Вход ────────────────────────────────────────────────

  loginForm?.addEventListener("submit", event => {
    event.preventDefault();

    submitForm(loginForm, "login", {
      email:
        document.getElementById("login-email").value.trim(),

      password:
        document.getElementById("login-password").value,

      remember: Boolean(
        loginForm.querySelector(
          'input[type="checkbox"]'
        )?.checked
      )
    });
  });

  // ─── Регистрация ─────────────────────────────────────────

  registerForm?.addEventListener("submit", event => {
    event.preventDefault();

    submitForm(registerForm, "register", {
      name:
        document.getElementById("reg-name").value.trim(),

      surname:
        document.getElementById("reg-surname").value.trim(),

      phone:
        document.getElementById("reg-phone").value.trim(),

      email:
        document.getElementById("reg-email").value.trim(),

      password:
        document.getElementById("reg-password").value
    });
  });

  // ─── Выход ───────────────────────────────────────────────

  document.getElementById("logout-btn")
    ?.addEventListener("click", async () => {
      try {
        await authRequest("logout");

        authUser = null;

        syncAuthUI();

        window.location.href = "/";
      } catch (error) {
        alert(
          "Не удалось выйти: " + error.message
        );
      }
    });

  // Проверяем, вошёл ли пользователь ранее.
  refreshAuth();
}

// ─── Запуск ─────────────────────────────────────────────────

document.addEventListener(
  "DOMContentLoaded",
  initRealAuthentication
);