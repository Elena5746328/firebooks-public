"use strict";

/* FIREBOOKS — счётчики личного кабинета */

(() => {
  const nav = document.querySelector(
    ".cabinet .sidebar__nav"
  );

  if (!nav) return;

  const paths = {
    library: "/library",
    bookmarks: "/bookmarks",
    reviews: "/my-reviews"
  };

  let requestVersion = 0;

  function normalizePath(path) {
    return path === "/my-books"
      ? "/library"
      : path;
  }

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

  function refreshActiveLink() {
    const current = normalizePath(
      window.location.pathname
    );

    nav.querySelectorAll(".sidebar__item")
      .forEach(link => {
        const path = normalizePath(
          new URL(link.href, location.href).pathname
        );

        const active = path === current;

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

  function setCount(type, count) {
    const targetPath = paths[type];

    nav.querySelectorAll(".sidebar__item")
      .forEach(link => {
        const path = normalizePath(
          new URL(link.href, location.href).pathname
        );

        if (path !== targetPath) return;

        let badge = link.querySelector(
          ".sidebar__badge, .sidebar__mobile-count"
        );

        if (!badge) {
          badge = document.createElement("span");
          badge.className = "sidebar__mobile-count";
          link.appendChild(badge);
        }

        badge.textContent = String(count);
        badge.hidden = false;
      });
  }

  async function getData(url) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (response.status === 401) {
      return { guest: true };
    }

    if (!response.ok) {
      throw new Error(
        `${url}: ошибка ${response.status}`
      );
    }

    return {
      guest: false,
      data: await response.json()
    };
  }

  function countLibrary(data) {
    const orders = Array.isArray(data.orders)
      ? data.orders
      : [];

    const bookIds = new Set();

    orders.forEach(order => {
      if (!Array.isArray(order.items)) return;

      order.items.forEach(book => {
        const id = book.id ?? book.book_id;

        if (id != null) {
          bookIds.add(String(id));
        }
      });
    });

    return bookIds.size;
  }

  function countBookmarks(data) {
    const books = Array.isArray(data.books)
      ? data.books
      : [];

    const ids = new Set();

    books.forEach(book => {
      if (book.id != null) {
        ids.add(String(book.id));
      }
    });

    return ids.size;
  }

  function countReviews() {
    return readList("firebooks_reviews").length;
  }

  async function refreshCounts() {
    const version = ++requestVersion;

    const [ordersResult, favoritesResult] =
      await Promise.allSettled([
        getData("/api/orders"),
        getData("/api/favorites")
      ]);

    // Не применяем устаревший ответ,
    // если пользователь сменил аккаунт.
    if (version !== requestVersion) return;

    let authorized = false;
    let guestResponses = 0;

    if (ordersResult.status === "fulfilled") {
      const result = ordersResult.value;

      if (result.guest) {
        guestResponses++;
        setCount("library", 0);
      } else {
        authorized = true;

        setCount(
          "library",
          countLibrary(result.data)
        );
      }
    } else {
      console.error(
        "FIREBOOKS: ошибка счётчика библиотеки",
        ordersResult.reason
      );
    }

    if (favoritesResult.status === "fulfilled") {
      const result = favoritesResult.value;

      if (result.guest) {
        guestResponses++;setCount("bookmarks", 0);
      } else {
        authorized = true;

        setCount(
          "bookmarks",
          countBookmarks(result.data)
        );
      }
    } else {
      console.error(
        "FIREBOOKS: ошибка счётчика закладок",
        favoritesResult.reason
      );
    }

    if (authorized) {
      setCount("reviews", countReviews());
    } else if (guestResponses === 2) {
      setCount("reviews", 0);
    }
  }

  function start() {
    refreshActiveLink();
    refreshCounts();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }

  window.addEventListener("storage", event => {
    if (
      event.key === "firebooks_reviews" ||
      event.key === "firebooks_favorites" ||
      event.key === "firebooks_orders" ||
      event.key === null
    ) {
      refreshCounts();
    }
  });

  document.addEventListener(
    "firebooks:auth-changed",
    refreshCounts
  );

  document.addEventListener(
    "firebooks:counts-changed",
    refreshCounts
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) {
        refreshCounts();
      }
    }
  );

  window.addEventListener("pageshow", event => {
    if (event.persisted) {
      refreshCounts();
    }
  });
})();