/* FIREBOOKS — заказы и закладки в профиле */

(() => {
  "use strict";

  const ordersBox = document.getElementById(
    "profile-active-orders"
  );

  const bookmarksBox = document.getElementById(
    "profile-bookmarks"
  );

  const ordersCount = document.getElementById(
    "profile-orders-count"
  );

  const bookmarksCount = document.getElementById(
    "profile-bookmarks-count"
  );

  if (!ordersBox || !bookmarksBox) return;

  const money = value =>
    (Number(value) || 0).toLocaleString("ru-RU") + " ₽";

  const finishedStatuses = new Set([
    "выполнен",
    "выполнено",
    "завершён",
    "завершен",
    "доставлен",
    "получен",
    "выдан",
    "отменён",
    "отменен",
    "отменено",
    "возвращён",
    "возвращен"
  ]);

  function isActive(order) {
    const status = String(
      order.status || ""
    ).trim().toLowerCase();

    return Boolean(status) &&
      !finishedStatuses.has(status);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);

    if (className) node.className = className;

    if (text !== undefined) {
      node.textContent = text;
    }

    return node;
  }

  function clear(node) {
    node.replaceChildren();
  }

  function message(container, text) {
    clear(container);

    container.appendChild(
      element("p", "profile__empty-text", text)
    );
  }

  async function loadJson(url) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        "Ошибка " + response.status + ": " + url
      );
    }

    return response.json();
  }

  function bookLink(id) {
    return "/book?id=" +
      encodeURIComponent(id);
  }

  function createCover(book, className) {
    const cover = element("div", className);
    const fallback = element(
      "span",
      "profile-preview__cover-fallback",
      "📖"
    );

    cover.appendChild(fallback);

    const source = book.cover_url ||
      book.cover || "";

    if (source) {
      const img = document.createElement("img");

      img.src = source;
      img.alt = book.title || "Обложка книги";
      img.loading = "lazy";

      img.addEventListener("load", () => {
        fallback.hidden = true;
      });

      img.addEventListener("error", () => {
        img.remove();
        fallback.hidden = false;
      });

      cover.appendChild(img);
    }

    return cover;
  }

  function createBookCard(book) {
    const link = element(
      "a",
      "profile-preview__book"
    );

    link.href = bookLink(book.id);

    link.appendChild(
      createCover(
        book,
        "profile-preview__book-cover"
      )
    );

    const info = element(
      "div",
      "profile-preview__book-info"
    );

    info.appendChild(
      element(
        "p",
        "profile-preview__book-title",
        book.title || "Без названия"
      )
    );

    if (book.author) {
      info.appendChild(
        element(
          "p",
          "profile-preview__book-author",
          book.author
        )
      );
    }

    if (book.new_price != null) {
      info.appendChild(
        element(
          "p",
          "profile-preview__book-price",
          money(book.new_price)
        )
      );
    }

    link.appendChild(info);

    return link;
  }

  function createOrderBook(book) {
    const link = element(
      "a",
      "profile-preview__order-book"
    );

    if (book.id != null) {
      link.href = bookLink(book.id);
    } else {
      link.removeAttribute("href");
    }

    link.appendChild(
      createCover(
        book,
        "profile-preview__order-cover"
      )
    );

    const info = element(
      "div",
      "profile-preview__order-book-info"
    );

    info.appendChild(
      element(
        "p",
        "profile-preview__order-book-title",
        book.title || "Книга"
      )
    );

    info.appendChild(element(
        "p",
        "profile-preview__order-book-detail",
        `${book.quantity || 1} шт. · ` +
        money(book.price)
      )
    );

    link.appendChild(info);

    return link;
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(
      String(value).replace(" ", "T")
    );

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("ru-RU");
  }

  function createOrderCard(order) {
    const card = element(
      "article",
      "profile-preview__order"
    );

    const header = element(
      "div",
      "profile-preview__order-header"
    );

    const heading = element(
      "div",
      "profile-preview__order-heading"
    );

    heading.appendChild(
      element(
        "strong",
        "profile-preview__order-number",
        "Заказ №" +
        (order.number || order.id)
      )
    );

    const date = formatDate(order.created_at);

    if (date) {
      heading.appendChild(
        element(
          "span",
          "profile-preview__order-date",
          date
        )
      );
    }

    header.appendChild(heading);

    header.appendChild(
      element(
        "span",
        "profile-preview__order-status",
        order.status || "В обработке"
      )
    );

    card.appendChild(header);

    const items = element(
      "div",
      "profile-preview__order-items"
    );

    const books = Array.isArray(order.items)
      ? order.items
      : [];

    books.forEach(book => {
      items.appendChild(
        createOrderBook(book)
      );
    });

    card.appendChild(items);

    const footer = element(
      "div",
      "profile-preview__order-footer"
    );

    footer.appendChild(
      element(
        "span",
        "",
        "Сумма заказа"
      )
    );

    footer.appendChild(
      element(
        "strong",
        "",
        money(order.total)
      )
    );

    card.appendChild(footer);

    return card;
  }

  function addShowMore(
    container,
    items,
    initialCount,
    createItem
  ) {
    const list = element(
      "div",
      container === bookmarksBox
        ? "profile-preview__grid"
        : "profile-preview__orders"
    );

    container.appendChild(list);

    let expanded = false;

    const button = element(
      "button",
      "profile-preview__more",
      "Показать ещё"
    );

    button.type = "button";

    function render() {
      clear(list);

      const visible = expanded
        ? items
        : items.slice(0, initialCount);

      visible.forEach(item => {
        list.appendChild(
          createItem(item)
        );
      });

      button.textContent = expanded
        ? "Свернуть"
        : `Показать ещё (${items.length - initialCount})`;
    }

    if (items.length > initialCount) {
      button.addEventListener("click", () => {
        expanded = !expanded;
        render();
      });

      container.appendChild(button);
    }

    render();
  }

  async function updateOrders() {
    message(
      ordersBox,
      "Загружаем ваши заказы..."
    );

    try {
      const data = await loadJson(
        "/api/orders"
      );

      if (data === null) {
        if (ordersCount) {
          ordersCount.textContent = "";
        }

        message(
          ordersBox,
          "Войдите в аккаунт, чтобы увидеть заказы."
        );

        return;
      }

      const orders = Array.isArray(data.orders)
        ? data.orders.filter(isActive)
        : [];

      if (ordersCount) {
        ordersCount.textContent =
          `(${orders.length})`;
      }

      if (!orders.length) {
        message(
          ordersBox,
          "У вас пока нет активных заказов."
        );

        return;
      }

      clear(ordersBox);

      addShowMore(
        ordersBox,
        orders,
        3,
        createOrderCard
      );

    } catch (error) {
      console.error(
        "FIREBOOKS: заказы",
        error
      );

      message(ordersBox,
        "Не удалось загрузить заказы."
      );
    }
  }

  async function updateBookmarks() {
    message(
      bookmarksBox,
      "Загружаем ваши закладки..."
    );

    try {
      const data = await loadJson(
        "/api/favorites"
      );

      if (data === null) {
        if (bookmarksCount) {
          bookmarksCount.textContent = "";
        }

        message(
          bookmarksBox,
          "Войдите в аккаунт, чтобы увидеть книги."
        );

        return;
      }

      const books = Array.isArray(data.books)
        ? data.books
        : [];

      if (bookmarksCount) {
        bookmarksCount.textContent =
          `(${books.length})`;
      }

      if (!books.length) {
        message(
          bookmarksBox,
          "Вы пока не добавили книги в закладки."
        );

        return;
      }

      clear(bookmarksBox);

      addShowMore(
        bookmarksBox,
        books,
        4,
        createBookCard
      );

    } catch (error) {
      console.error(
        "FIREBOOKS: закладки",
        error
      );

      message(
        bookmarksBox,
        "Не удалось загрузить закладки."
      );
    }
  }

  function updateProfile() {
    updateOrders();
    updateBookmarks();
  }

  updateProfile();

  document.addEventListener(
    "firebooks:auth-changed",
    updateProfile
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) {
        updateProfile();
      }
    }
  );

  window.addEventListener(
    "pageshow",
    event => {
      if (event.persisted) {
        updateProfile();
      }
    }
  );
})();