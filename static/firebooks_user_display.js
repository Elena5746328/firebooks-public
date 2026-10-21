/* FIREBOOKS — имя текущего пользователя */

(() => {
  "use strict";

  async function updateUserDisplay() {
    let user = null;

    try {
      const response = await fetch("/api/auth/me", {
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Не удалось проверить авторизацию");
      }

      const data = await response.json();
      user = data.user || null;

    } catch (error) {
      console.error("Ошибка загрузки пользователя:", error);
      return;
    }

    const name = user?.name?.trim() || "Гость";
    const letter = name.charAt(0).toUpperCase();

    // Имя в верхнем меню
    document.querySelectorAll(".user-name").forEach(el => {
      el.textContent = user ? name : "Войти";
    });

    // Ссылка на профиль в шапке
    const userMenu = document.getElementById("user-menu");

    if (userMenu) {
      userMenu.href = "/profile";
    }

    // Имя в боковом меню кабинета
    document.querySelectorAll(".sidebar__name").forEach(el => {
      el.textContent = name;
    });

    // Аватар в боковом меню
    document.querySelectorAll(".sidebar__avatar").forEach(el => {
      el.textContent = letter;
    });

    // Имя автора в карточках отзывов
    document.querySelectorAll(".review-block__author").forEach(el => {
      el.textContent = name;
    });

    // Аватар автора отзыва
    document.querySelectorAll(".review-block__avatar").forEach(el => {
      el.textContent = letter;
    });
  }

  updateUserDisplay();

  document.addEventListener(
    "firebooks:auth-changed",
    updateUserDisplay
  );
})();