"use strict";

// Личный кабинет FIREBOOKS.
// Авторизация теперь управляется auth_frontend.js.

(() => {
  function readList(key) {
    try {
      const value = JSON.parse(
        localStorage.getItem(key) || "[]"
      );

      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function refreshCabinet() {
    const counts = {
      "/bookmarks": readList("firebooks_favorites").length,
      "/my-reviews": readList("firebooks_reviews").length
    };

    document.querySelectorAll(".sidebar__item")
      .forEach(link => {
        const path = new URL(
          link.href,
          window.location.href
        ).pathname;

        const badge = link.querySelector(".sidebar__badge");

        if (badge) {
          if (Object.prototype.hasOwnProperty.call(counts, path)) {
            badge.textContent = String(counts[path]);
            badge.hidden = false;
          } else {
            badge.hidden = true;
          }
        }

        const active =
          path === window.location.pathname;

        link.classList.toggle(
          "sidebar__item--active",
          active
        );

        if (active) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });
  }

  document.addEventListener(
    "DOMContentLoaded",
    refreshCabinet
  );

  window.addEventListener(
    "storage",
    refreshCabinet
  );

  document.addEventListener(
    "firebooks:auth-changed",
    refreshCabinet
  );
})();