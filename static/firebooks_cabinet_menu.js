/* FIREBOOKS — единое меню и корректные счётчики личного кабинета */

(() => {
  "use strict";

  const nav = document.querySelector(".cabinet .sidebar__nav");
  if (!nav) return;

  const SVG_NS = "http://www.w3.org/2000/svg";

  const sections = [
    {
      href: "/library",
      label: "Библиотека",
      icon: "book",
      count: "library"
    },
    {
      href: "/bookmarks",
      label: "Закладки",
      icon: "bookmark",
      count: "bookmarks"
    },
    {
      href: "/my-reviews",
      label: "Мои отзывы",
      icon: "reviews",
      count: "reviews"
    },
    {
      href: "/profile",
      label: "Профиль",
      icon: "user"
    }
  ];

  const paths = {
    book: [
      "M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
      "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
    ],

    bookmark: [
      "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
    ],

    reviews: [
      "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
    ],

    user: [
      "M20 21a8 8 0 0 0-16 0",
      "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"
    ]
  };

  function icon(name) {
    const svg = document.createElementNS(SVG_NS, "svg");

    for (const [key, value] of Object.entries({
      viewBox: "0 0 24 24",
      width: "20",
      height: "20",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true"
    })) {
      svg.setAttribute(key, value);
    }

    svg.classList.add("sidebar__mobile-icon");

    for (const d of paths[name]) {
      const path = document.createElementNS(
        SVG_NS,
        "path"
      );

      path.setAttribute("d", d);
      svg.appendChild(path);
    }

    return svg;
  }

  function normalizedPath(link) {
    const path = new URL(
      link.getAttribute("href"),
      location.href
    ).pathname;

    return path === "/my-books"
      ? "/library"
      : path;
  }

  for (const section of sections) {
    let link = [
      ...nav.querySelectorAll("a.sidebar__item")
    ].find(item => normalizedPath(item) === section.href);

    if (!link) {
      link = document.createElement("a");
      link.href = section.href;

      link.className =
        "sidebar__item sidebar__item--mobile-only";

      const label = document.createElement("span");
      label.className = "sidebar__label";
      label.textContent = section.label;

      link.appendChild(label);
      nav.appendChild(link);
    }

    if (!link.querySelector("svg")) {
      link.insertBefore(
        icon(section.icon),
        link.firstChild
      );
    }

    if (section.count) {
      let badge = link.querySelector(
        ".sidebar__badge, .sidebar__mobile-count"
      );

      if (!badge) {
        badge = document.createElement("span");
        badge.textContent = "…";
        link.appendChild(badge);
      }

      badge.classList.add("sidebar__badge");
      badge.dataset.count = section.count;
      badge.hidden = false;
    }

    const currentPath =
      location.pathname === "/my-books"
        ? "/library"
        : location.pathname;

    const active = section.href === currentPath;

    link.classList.toggle(
      "sidebar__item--active",
      active
    );

    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }

  function setCount(type, value) {
    nav.querySelectorAll(
      `.sidebar__badge[data-count="${type}"]`
    ).forEach(badge => {
      badge.textContent = String(value);
      badge.hidden = false;
    });
  }

  function readArray(key) {
    try {
      const value = JSON.parse(
        localStorage.getItem(key) || "[]"
      );

      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function bookId(item) {
    const id =
      item && typeof item === "object"
        ? item.book_id ?? item.id ?? item.book?.id
        : item;

    return id == null
      ? ""
      : String(id).trim();
  }

  function countOrders(data) {
    const orders = Array.isArray(data?.orders)
      ? data.orders
      : Array.isArray(data)
        ? data
        : [];

    const unique = new Set();

    for (const order of orders) {
      if (!Array.isArray(order?.items)) continue;

      for (const item of order.items) {
        if (!item?.title) continue;

        const id = bookId(item);

        unique.add(
          id || `title:${String(item.title)}`
        );
      }
    }

    return unique.size;
  }

  function countFavorites(data) {
    const items = Array.isArray(data)
      ? data
      : Array.isArray(data?.favorites)
        ? data.favorites
        : Array.isArray(data?.books)
          ? data.books
          : [];

    return new Set(
      items.map(bookId).filter(Boolean)
    ).size;
  }

    function countReviews(data) {
    if (Array.isArray(data?.reviews)) {
      return data.reviews.length;
    }

    if (Array.isArray(data)) {
      return data.length;
    }

    throw new Error("Неизвестный формат списка отзывов");
  }

  let requestVersion = 0;

  async function updateServerCounts() {
    const version = ++requestVersion;

  const endpoints = [
    ["library", "/api/orders", countOrders],
    ["bookmarks", "/api/favorites", countFavorites],
    [
      "reviews",
      "/api/reviews/mine",
      data => Array.isArray(data?.reviews)
        ? data.reviews.length
        : 0
    ]
  ];

    await Promise.all(
      endpoints.map(async ([type, url, count]) => {
        try {
          const response = await fetch(url, {
            credentials: "same-origin",
            cache: "no-store"
          });

          if (version !== requestVersion) return;

          if (response.status === 401) {
            setCount(type, 0);
            return;
          }

          if (!response.ok) {
            throw new Error(
              `${url}: ${response.status}`
            );
          }

          const data = await response.json();

          if (version === requestVersion) {
            setCount(type, count(data));
          }

        } catch (error) {
          if (version === requestVersion) {
            setCount(type, "—");
          }

          console.warn(
            "FIREBOOKS: не удалось обновить счётчик",
            type,
            error
          );
        }
      })
    );
  }

  function refreshCounts() {
    setCount("library", "…");
    setCount("bookmarks", "…");
    setCount("reviews", "…");

    updateServerCounts();
  }

})();