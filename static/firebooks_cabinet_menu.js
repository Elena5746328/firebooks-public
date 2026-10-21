/* FIREBOOKS — единое меню личного кабинета */

(() => {
  "use strict";

  const nav = document.querySelector(
    ".cabinet .sidebar__nav"
  );

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
    const svg = document.createElementNS(
      SVG_NS,
      "svg"
    );

    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");

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

  const pathOf = link => {
    const path = new URL(
      link.getAttribute("href"),
      location.href
    ).pathname;

    return path === "/my-books"
      ? "/library"
      : path;
  };

  for (const section of sections) {
    let link = [
      ...nav.querySelectorAll("a.sidebar__item")
    ].find(item => pathOf(item) === section.href);

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

    if (
      section.count &&
      !link.querySelector(
        ".sidebar__badge, .sidebar__mobile-count"
      )
    ) {
      const count = document.createElement("span");

      count.className = "sidebar__mobile-count";
      count.dataset.count = section.count;
      count.textContent = "0";

      link.appendChild(count);
    }

    if (section.href === location.pathname) {
      link.classList.add("sidebar__item--active");
      link.setAttribute("aria-current", "page");
    }
  }

  /* Счётчики созданных пунктов */

  const mobileCounts = nav.querySelectorAll(
    ".sidebar__mobile-count"
  );

  if (!mobileCounts.length) return;

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
    const id = item && typeof item === "object"
      ? item.book_id ?? item.id ?? item.book?.id
      : item;

    return id == null
      ? ""
      : String(id).trim();
  }

  function setCount(type, value) {
    const el = nav.querySelector(
      `.sidebar__mobile-count[data-count="${type}"]`
    );

    if (el) {
      el.textContent = String(value);
    }
  }

  function updateLocalCounts() {
    const purchased = new Set();

    readArray("firebooks_orders").forEach(order => {
      if (!Array.isArray(order?.items)) return;

      order.items.forEach(item => {
        const id = bookId(item);

        if (id) purchased.add(id);
      });
    });

    setCount("library", purchased.size);

    const favorites = readArray(
      "firebooks_favorites"
    );

    setCount(
      "bookmarks",
      new Set(
        favorites.map(bookId).filter(Boolean)
      ).size
    );

    setCount(
      "reviews",
      readArray("firebooks_reviews").length
    );
  }

  async function updateServerFavorites() {
    try {
      const response = await fetch(
        "/api/favorites",
        {
          credentials: "same-origin",
          cache: "no-store"
        }
      );

      if (!response.ok) return;

      const data = await response.json();

      const items = Array.isArray(data)
        ? data
        : (
            data.favorites ??
            data.books ??
            []
          );

      if (Array.isArray(items)) {
        setCount(
          "bookmarks",
          new Set(
            items.map(bookId).filter(Boolean)
          ).size
        );
      }
    } catch (error) {
      console.debug(
        "Счётчик закладок пока недоступен",
        error
      );
    }
  }

  updateLocalCounts();
  updateServerFavorites();

  window.addEventListener("storage", () => {
    updateLocalCounts();
    updateServerFavorites();
  });

  document.addEventListener(
    "firebooks:auth-changed",
    () => {
      updateLocalCounts();
      updateServerFavorites();
    }
  );
})();