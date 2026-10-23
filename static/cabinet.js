"use strict";

/*
  FIREBOOKS — выделение текущего раздела.

  Счётчиками управляет
  firebooks_cabinet_menu.js.
*/

(() => {

  function markActiveSection() {
    const current =
      location.pathname === "/my-books"
        ? "/library"
        : location.pathname;

    document.querySelectorAll(
      ".cabinet .sidebar__item"
    ).forEach(link => {

      const path = new URL(
        link.href,
        location.href
      ).pathname;

      const normalized =
        path === "/my-books"
          ? "/library"
          : path;

      const active = normalized === current;

      link.classList.toggle(
        "sidebar__item--active",
        active
      );

      if (active) {
        link.setAttribute(
          "aria-current",
          "page"
        );
      } else {
        link.removeAttribute(
          "aria-current"
        );
      }

    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      markActiveSection
    );
  } else {
    markActiveSection();
  }

})();