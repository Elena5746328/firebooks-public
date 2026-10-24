"use strict";

const API = "/api";
const sectionState = {};
const USER_KEY = "firebooks_user_name";

function formatPrice(value) {
  const number = Number(String(value ?? 0).replace(/[^\d.,]/g, "").replace(",", "."));
  return (Number.isFinite(number) ? number : 0).toLocaleString("ru-RU") + " ₽";
}

function priceNumber(value) {
  return Number(String(value ?? 0).replace(/[^\d]/g, "")) || 0;
}

function starsHTML(rating) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  return Array.from({ length: 5 }, (_, index) =>
    `<span class="star${index < value ? " filled" : ""}">★</span>`
  ).join("");
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "'"
  }[character]));
}

function readStorage(key, fallback = []) {
  try {
    const result = JSON.parse(localStorage.getItem(key) || "null");
    return result ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function skeletonCards(container, count = 5) {
  if (!container) return;
  container.replaceChildren();

  for (let i = 0; i < count; i++) {
    const card = document.createElement("div");
    card.className = "skeleton-card";
    card.innerHTML = `
      <div class="skeleton-cover"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
    `;
    container.appendChild(card);
  }
}

function bookCardHTML(book) {
  const id = Number(book.id) || 0;
  const title = escapeHTML(book.full_title || book.title);
  const author = escapeHTML(book.author);
  const cover = escapeHTML(book.cover_url);
  const type = escapeHTML(book.cover_type);
  const status = "В корзину";
  const discount = Number(book.discount) || 0;

  return `
    <div class="book-card" data-id="${id}">
      <div class="book-card__cover">
        <img src="${cover}" alt="${title}" loading="lazy">
        ${discount > 0
          ? `<span class="book-card__discount">-${discount}%</span>`
          : ""}
        <button type="button" class="book-card__fav"
                aria-label="Добавить в избранное"
                aria-pressed="false">♥</button>
      </div>
      <div class="book-card__info">
        <p class="book-card__type">${type}</p>
        <div class="book-card__prices">
          <span class="book-card__old-price">${formatPrice(book.old_price)}</span>
          <span class="book-card__new-price">${formatPrice(book.new_price)}</span>
        </div>
        <p class="book-card__title">${title}</p>
        <p class="book-card__author">${author}</p>
        <div class="book-card__rating">${starsHTML(book.rating)}</div>
        <button type="button" class="book-card__btn">${status}</button>
      </div>
    </div>
  `;
}

async function loadSection(endpoint, gridId, count = 5) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  const section = grid.closest(".books-section");
  const viewAllLink = section?.querySelector(".section-all");

  skeletonCards(grid, count);

  try {
    const response = await fetch(`${API}${endpoint}`);

    if (!response.ok) {
      throw new Error(`Ошибка API: ${response.status}`);
    }

    const books = await response.json();

    if (!Array.isArray(books)) {
      throw new Error("Неверный формат списка книг");
    }

    sectionState[gridId] = {
      books,
      expanded: false
    };

    function renderSection() {
      const state = sectionState[gridId];

      const visibleBooks = state.expanded
        ? state.books
        : state.books.slice(0, count);

      grid.classList.toggle(
        "books-expanded",
        state.expanded
      );

      grid.innerHTML = visibleBooks
        .map(bookCardHTML)
        .join("");

      syncFavoriteButtons(grid);

      if (viewAllLink && books.length > count) {
        viewAllLink.textContent = state.expanded
          ? "Свернуть ↑"
          : "Смотреть все →";

        viewAllLink.setAttribute(
          "aria-expanded",
          String(state.expanded)
        );
      }
    }

    renderSection();

    if (viewAllLink && books.length > count) {
      viewAllLink.addEventListener("click", event => {
        event.preventDefault();

        sectionState[gridId].expanded =
          !sectionState[gridId].expanded;

        renderSection();
      });
    }

    // Если в разделе только пять книг,
    // ссылка продолжит вести в полный каталог.

  } catch (error) {
    grid.innerHTML = "";

    const message = document.createElement("p");
    message.textContent = "Не удалось загрузить книги";
    message.style.gridColumn = "1 / -1";

    grid.appendChild(message);

    console.error("Ошибка загрузки книг:", error);
  }
}

async function loadHero() {
  const title = document.getElementById("hero-title");
  if (!title) return;

  const description = document.getElementById("hero-desc");
  const author = document.getElementById("hero-author");
  const cover = document.getElementById("hero-cover");
  const teaserTitle = document.getElementById("hero-teaser-title");
  const teaserFirst = document.getElementById("hero-teaser-first");
  const teaserSecond = document.getElementById("hero-teaser-second");
  const buyButton = document.getElementById("hero-buy");
  const prevArrow = document.getElementById("hero-prev");
  const nextArrow = document.getElementById("hero-next");

  const slides = [
    {
      searchTitle: "Четвёртое крыло",
      title: "Четвёртое крыло",
      author: "Ребекка Яррос",
      description: "",
      teaserTitle: "Не каждому суждено стать всадником дракона.",
      teaserFirst:
        "Академия Басгиат не прощает слабости и ошибок. Здесь недостаточно просто мечтать о драконах — нужно доказать, что ты достоин оказаться рядом с ними.",
      teaserSecond:
        "Но что, если самое опасное испытание ждёт вовсе не там, где его ожидаешь?",
      cover_url: "",
      bookId: null
    },
    {
      searchTitle: "Академия вампиров",
      title: "Академия вампиров",
      author: "Райчел Мид",
      description: "История о тайнах, выборе и верности.",
      teaserTitle:
        "Некоторые тайны лучше держать подальше от посторонних глаз.",
      teaserFirst:
        "Розмари Хэзэвей привыкла нарушать правила, особенно когда дело касается защиты лучшей подруги. Но возвращение в академию Святого Владимира оказывается куда сложнее, чем она ожидала. Здесь опасность скрывается не только за пределами школьных стен, а доверять собственным чувствам порой труднее, чем противостоять врагам.",
      teaserSecond:
        "И что делать, когда сердце начинает спорить с долгом?",
      cover_url: "",
      bookId: null
    },
    {
      searchTitle: "Гордость и предубеждение",
      title: "Гордость и предубеждение",
      author: "Джейн Остин",
      description: "Роман о чувствах и первых впечатлениях.",
      teaserTitle:
        "Первое впечатление бывает обманчивым. Особенно когда дело касается любви.",
      teaserFirst:
        "Элизабет Беннет не собирается жить по чужим правилам. А мистер Дарси кажется ей последним человеком, способным завоевать ее расположение. Но за холодной сдержанностью и острыми разговорами скрывается гораздо больше, чем кажется.",
      teaserSecond:
        "Что окажется сильнее — гордость, предубеждение или неожиданные чувства?",
      cover_url: "",
      bookId: null
    }
  ];

    // Меняем местами второй и третий баннеры
  [slides[1], slides[2]] = [slides[2], slides[1]];

  let activeSlide = 0;

  function normalizeTitle(value) {
    return String(value || "")
      .toLocaleLowerCase("ru")
      .replace(/ё/g, "е")
      .trim();
  }

  function showSlide(index) {
    const slide = slides[index];

    if (!slide.cover_url) {
      console.warn("Для баннера не найдена обложка:", slide.title);
      return;
    }

    activeSlide = index;

    const heroInner = title.closest(".hero__inner");

    if (heroInner) {
      const themes = ["dragons", "scales", "feathers"];

      heroInner.dataset.pattern = themes[index];

      // Индивидуальная надпись для каждой книги
      const badge = heroInner.querySelector(".hero__badge");

      if (badge) {
        const labels = [
          "01 / ДРАКОНЬЯ АКАДЕМИЯ",
          "02 / АНГЛИЙСКАЯ КЛАССИКА",
          "03 / ТАЙНЫ АКАДЕМИИ"
        ];

        badge.textContent = labels[index];
      }
    }

    if (description) {
      description.textContent = slide.description;
    }

    title.textContent = slide.title;

    if (author) {
      author.textContent = slide.author;
    }

    if (teaserTitle) {
      teaserTitle.textContent =slide.teaserTitle;
    }

    if (teaserFirst) {
      teaserFirst.textContent = slide.teaserFirst;
    }

    if (teaserSecond) {
      teaserSecond.textContent = slide.teaserSecond;
    }

    if (cover) {
      cover.src = slide.cover_url;
      cover.alt = `Обложка книги «${slide.title}»`;
    }

    if (buyButton) {
      buyButton.href = slide.bookId != null
        ? `/book?id=${encodeURIComponent(slide.bookId)}`
        : `/catalog?q=${encodeURIComponent(slide.searchTitle)}`;
    }
  }

  try {
    const [heroResponse, booksResponse] = await Promise.all([
      fetch(`${API}/hero`),
      fetch(`${API}/books`)
    ]);

    if (!heroResponse.ok || !booksResponse.ok) {
      throw new Error("Не удалось загрузить книги для баннеров");
    }

    const heroData = await heroResponse.json();
    const books = await booksResponse.json();

    if (!Array.isArray(books)) {
      throw new Error("Каталог вернул неверный формат данных");
    }

    // Первый баннер сохраняет свою исходную обложку.
    slides[0].title = heroData.title || slides[0].title;
    slides[0].author = heroData.author || slides[0].author;
    slides[0].description = heroData.description || "";
    slides[0].cover_url =
      heroData.cover_url || cover?.getAttribute("src") || "";

    // Находим все три книги в существующем каталоге.
    slides.forEach((slide, index) => {
      const book = books.find(item => {
        const bookTitle = normalizeTitle(
          item.full_title || item.title
        );

        return bookTitle.includes(
          normalizeTitle(slide.searchTitle)
        );
      });

      if (!book) {
        console.warn("Книга отсутствует в каталоге:", slide.searchTitle);
        return;
      }

      slide.bookId = book.id ?? null;

      // Для второго и третьего баннеров
      // используем обложки из каталога.
      if (index !== 0) {
        slide.cover_url = book.cover_url || "";
      }
    });

    const heroInner = title.closest(".hero__inner");

    if (heroInner && window.innerWidth > 850) {
      // Временно скрываем баннер для измерения
      heroInner.style.visibility = "hidden";
      heroInner.style.height = "auto";

      // Измеряем второй баннер — «Академия вампиров»
      showSlide(2);

      const referenceHeight = Math.ceil(
        heroInner.getBoundingClientRect().height
      );

      // Фиксируем одинаковую высоту всех трёх баннеров
      heroInner.style.height = `${referenceHeight}px`;

      // Возвращаем «Четвёртое крыло»
      showSlide(0);
      heroInner.style.visibility = "";
    } else {
      showSlide(0);
    }

    // Переключение баннеров боковыми стрелками

    prevArrow?.addEventListener("click", () => {
      const previousIndex =
        (activeSlide - 1 + slides.length) % slides.length;

      showSlide(previousIndex);
    });

    nextArrow?.addEventListener("click", () => {
      const nextIndex =
        (activeSlide + 1) % slides.length;

      showSlide(nextIndex);
    });

  } catch (error) {
    console.error("Ошибка загрузки баннеров:", error);
  }
}

// ─── Пользователь ───────────────────────────────────────────

function getUserName() {
  return localStorage.getItem(USER_KEY) || null;
}

function getUserSurname() {
  return localStorage.getItem("firebooks_user_surname") || null;
}

function getUserPhone() {
  return localStorage.getItem("firebooks_user_phone") || null;
}

function getUserEmail() {
  return localStorage.getItem("firebooks_user_email") || null;
}

function isLoggedIn() {
  return Boolean(getUserName());
}

function updateUserName() {
  const name = getUserName();
  const trigger =
    document.getElementById("user-menu") ||
    document.getElementById("login-trigger");

  if (trigger) {
    if (name) {
      trigger.id = "user-menu";
      trigger.href = "/profile";
      trigger.classList.remove("nav__link--login");
      trigger.classList.add("nav__link--user");

      trigger.replaceChildren();

      const nameSpan = document.createElement("span");
      nameSpan.className = "user-name";
      nameSpan.textContent = name;

      trigger.appendChild(nameSpan);
    } else {
      trigger.id = "login-trigger";
      trigger.href = "#";
      trigger.textContent = "Войти";
      trigger.classList.remove("nav__link--user", "user-dropdown");
      trigger.classList.add("nav__link--login");
    }
  }

  document.querySelectorAll(".sidebar__name").forEach(element => {
    element.textContent = name || "Гость";
  });

  document.querySelectorAll(".sidebar__avatar").forEach(element => {
    element.textContent = (name || "Г").charAt(0).toUpperCase();
  });

  document.querySelectorAll(".user-name").forEach(element => {
    element.textContent = name || "Войти";
  });
}

function fillProfileData() {
  const name = getUserName();
  const surname = getUserSurname();
  const email = getUserEmail();
  const phone = getUserPhone();

  const fields = {
    "profile-name": name || "Гость",
    "profile-surname": surname || "",
    "profile-email": email || "—",
    "profile-phone": phone || "—",
    "profile-avatar-letter": (name || "Г").charAt(0).toUpperCase()
  };

  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });

  const surnameRow = document.getElementById("profile-surname-item");
  if (surnameRow) surnameRow.style.display = surname ? "" : "none";
}

function logout() {
  [
    "firebooks_user_name",
    "firebooks_user_surname",
    "firebooks_user_phone",
    "firebooks_user_email"
  ].forEach(key => localStorage.removeItem(key));

  updateUserName();
  fillProfileData();

  window.location.href = "/";
}

// ─── Модальные окна авторизации ──────────────────────────────

function openModal(modal) {
  if (!modal) return;
  modal.classList.add("modal--open");
  document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("modal--open");

  if (!document.querySelector(".modal.modal--open")) {
    document.body.style.overflow = "";
  }
}

function initAuthentication() {
  const loginModal = document.getElementById("login-modal");
  const registerModal = document.getElementById("register-modal");

  document.addEventListener("click", event => {
    const loginLink = event.target.closest("#login-trigger");
    if (loginLink) {
      event.preventDefault();

      if (isLoggedIn()) {
        window.location.href = "/profile";
      } else {
        openModal(loginModal);
      }
      return;
    }

    const userLink = event.target.closest("#user-menu");
    if (userLink) {
      event.preventDefault();
      window.location.href = "/profile";
      return;
    }

    if (event.target.closest(".modal__register-link")) {
      event.preventDefault();
      closeModal(loginModal);
      openModal(registerModal);
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
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeModal(loginModal);
      closeModal(registerModal);
    }
  });

  const loginForm = document.getElementById("login-form");

  if (loginForm) {
    loginForm.addEventListener("submit", event => {
      event.preventDefault();

      const email = document.getElementById("login-email")?.value.trim();
      if (!email) return;

      // Демонстрационный вход. Проверка пароля требует серверного API.
      const existingEmail = getUserEmail();
      const existingName = getUserName();

      const name =
        existingName && existingEmail === email
          ? existingName
          : email.split("@")[0];

      localStorage.setItem("firebooks_user_name", name);
      localStorage.setItem("firebooks_user_email", email);

      updateUserName();
      fillProfileData();
      closeModal(loginModal);
      loginForm.reset();
    });
  }

  const registerForm = document.getElementById("register-form");

  if (registerForm) {
    registerForm.addEventListener("submit", event => {
      event.preventDefault();

      const name = document.getElementById("reg-name")?.value.trim();
      const surname = document.getElementById("reg-surname")?.value.trim();
      const phone = document.getElementById("reg-phone")?.value.trim();
      const email = document.getElementById("reg-email")?.value.trim();

      if (!name || !email || !phone) return;

      localStorage.setItem("firebooks_user_name", name);
      localStorage.setItem("firebooks_user_email", email);
      localStorage.setItem("firebooks_user_phone", phone);

      if (surname) {
        localStorage.setItem("firebooks_user_surname", surname);
      } else {
        localStorage.removeItem("firebooks_user_surname");
      }

      updateUserName();
      fillProfileData();
      closeModal(registerModal);
      registerForm.reset();
    });
  }

  document.getElementById("logout-btn")?.addEventListener("click", logout);
}

// ─── Избранное: SQLite ───────────────────────────────────────

const favoriteIds = new Set();
let favoritesLoaded = false;
let favoritesRequestVersion = 0;

function getFavorites() {
  return [...favoriteIds];
}

function favoriteId(card) {
  return card?.dataset.id || "";
}

function extractFavoriteIds(data) {
  const items = Array.isArray(data)
    ? data
    : data?.favorites ?? data?.books ?? [];

  if (!Array.isArray(items)) {
    throw new Error("Неожиданный формат ответа избранного");
  }

  return items
    .map(item => {
      if (item && typeof item === "object") {
        return item.book_id ?? item.id ?? item.book?.id;
      }
      return item;
    })
    .filter(id => id !== null && id !== undefined)
    .map(String);
}

function syncFavoriteButtons(root = document) {
  root.querySelectorAll(".book-card__fav").forEach(button => {
    const card = button.closest(".book-card");
    const id = favoriteId(card);
    if (!id) return;

    const active = favoriteIds.has(String(id));

    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute(
      "aria-label",
      active ? "Удалить из избранного" : "Добавить в избранное"
    );
  });
}

async function loadFavorites() {
  const version = ++favoritesRequestVersion;

  try {
    const response = await fetch("/api/favorites", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (version !== favoritesRequestVersion) return;

    if (response.status === 401) {
      favoriteIds.clear();
      favoritesLoaded = true;
      syncFavoriteButtons();
      return;
    }

    if (!response.ok) {
      throw new Error("Ошибка загрузки закладок: " + response.status);
    }

    const data = await response.json();

    if (version !== favoritesRequestVersion) return;

    favoriteIds.clear();

    extractFavoriteIds(data).forEach(id => {
      favoriteIds.add(id);
    });

    favoritesLoaded = true;
    syncFavoriteButtons();
  } catch (error) {
    if (version !== favoritesRequestVersion) return;

    favoritesLoaded = false;
    console.error("Не удалось загрузить избранное:", error);
  }
}

async function toggleFavorite(button) {
  const card = button.closest(".book-card");
  const id = favoriteId(card);

  if (!id || button.disabled) return;

  if (!favoritesLoaded) {
    alert("Закладки ещё загружаются. Попробуйте через секунду.");
    return;
  }

  const wasFavorite = favoriteIds.has(String(id));

  button.disabled = true;

  try {
    const response = await fetch(
      "/api/favorites/" + encodeURIComponent(id),
      {
        method: wasFavorite ? "DELETE" : "PUT",
        credentials: "same-origin"
      }
    );

    if (response.status === 401) {
      alert("Чтобы сохранять книги, войдите в аккаунт.");
      await loadFavorites();
      return;
    }

    if (!response.ok) {
      throw new Error("Ошибка сохранения закладки: " + response.status);
    }

    if (wasFavorite) {
      favoriteIds.delete(String(id));
    } else {
      favoriteIds.add(String(id));
    }

    // Синхронизируем все карточки одной книги на странице.
    syncFavoriteButtons();

    window.dispatchEvent(new CustomEvent("firebooks:favorites-changed"));
  } catch (error) {
    console.error("Не удалось изменить закладку:", error);
    alert("Не удалось сохранить закладку. Попробуйте ещё раз.");
  } finally {
    button.disabled = false;
  }
}

// После входа или выхода загружаем закладки нового пользователя.
window.addEventListener("firebooks:auth-changed", () => {
  favoritesLoaded = false;
  favoriteIds.clear();
  syncFavoriteButtons();
  loadFavorites();
});

// ─── Покупка и карточки книг ─────────────────────────────────

function itemFromBookCard(card) {
  const cover = card.querySelector(".book-card__cover img");
  const title = card.querySelector(".book-card__title");
  const author = card.querySelector(".book-card__author");
  const price = card.querySelector(".book-card__new-price");

  const amount = priceNumber(price?.textContent);

  return {
    id: Number(card.dataset.id) || null,
    cover: cover?.getAttribute("src") || "",
    title: title?.textContent.trim() || "",
    author: author?.textContent.trim() || "",
    price: amount,
    priceText: formatPrice(amount),
    quantity: 1
  };
}

async function buyBook(card) {
  const bookId = Number(card?.dataset.id);
  const button = card?.querySelector(".book-card__btn");

  if (!Number.isInteger(bookId) || bookId <= 0) {
    alert("Не удалось определить книгу.");
    return;
  }

  if (button?.disabled) return;

  if (button) {
    button.disabled = true;
    button.textContent = "Добавляем...";
  }

  try {
    const response = await fetch("/api/cart", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        book_id: bookId,
        quantity: 1
      })
    });

    if (response.status === 401) {
      alert("Чтобы добавить книгу в корзину, войдите в аккаунт.");
      return;
    }

    if (!response.ok) {
      throw new Error("Ошибка добавления: " + response.status);
    }

    if (button) {
      button.textContent = "Добавлено ✓";
    }

    window.dispatchEvent(
      new CustomEvent("firebooks:cart-changed")
    );

  } catch (error) {
    console.error("Ошибка корзины:", error);
    alert("Не удалось добавить книгу в корзину.");

  } finally {
    if (button) {
      setTimeout(() => {
        button.disabled = false;
        button.textContent = "В корзину";
      }, 1000);
    }
  }
}

function initBookCardClicks() {
  document.addEventListener("click", event => {
    const favoriteButton = event.target.closest(".book-card__fav");

    if (favoriteButton) {
      event.preventDefault();
      event.stopPropagation();
      toggleFavorite(favoriteButton);
      return;
    }

    const buyButton = event.target.closest(".book-card__btn");

    if (buyButton) {
      event.preventDefault();
      event.stopPropagation();

      const card = buyButton.closest(".book-card");
      if (card) buyBook(card);
      return;
    }

    const card = event.target.closest(".book-card");

    if (card && card.dataset.id) {
      if (event.target.closest("a, button, input, textarea, select")) {
        return;
      }

      window.location.href =
        `/book?id=${encodeURIComponent(card.dataset.id)}`;
    }
  });
}

// ─── «Читать больше» ─────────────────────────────────────────

function initToggleButtons() {
  document.querySelectorAll(".review-block__toggle").forEach(button => {
    if (button.dataset.toggleReady === "true") return;

    const text = button.previousElementSibling;
    if (!text) return;

    button.dataset.toggleReady = "true";

    const clampClass= "review-block__text--clamped";

    if (text.classList.contains(clampClass)) {
      if (text.scrollHeight <= text.clientHeight + 2) {
        button.style.display = "none";
      }
    }

    button.addEventListener("click", () => {
      const collapsed = text.classList.toggle(clampClass);
      button.textContent = collapsed ? "Читать больше" : "Свернуть";
    });
  });

  const description = document.getElementById("book-desc-text");

  if (description && !description.dataset.descriptionReady) {
    description.dataset.descriptionReady = "true";
    description.classList.add("clamped");
  }
}

// ─── Звёзды оценок ───────────────────────────────────────────

function setupStars(container, onSelect = null) {
  if (!container || container.dataset.starsReady === "true") return;

  container.dataset.starsReady = "true";

  const stars = Array.from(container.querySelectorAll(".review-star"));
  let selected = 0;

  function paint(value) {
    stars.forEach(star => {
      star.classList.toggle(
        "filled",
        Number(star.dataset.value) <= value
      );
    });
  }

  stars.forEach(star => {
    star.addEventListener("mouseenter", () => {
      paint(Number(star.dataset.value));
    });

    star.addEventListener("click", () => {
      selected = Number(star.dataset.value);
      paint(selected);
      if (onSelect) onSelect(selected);
    });
  });

  container.addEventListener("mouseleave", () => paint(selected));

  container.setRating = value => {
    selected = Number(value) || 0;
    paint(selected);
  };

  container.getRating = () => selected;
}

function initReviewPrompts() {
  document.querySelectorAll(".review-prompt__stars").forEach(container => {
    setupStars(container);
  });
}

// ─── Модальное окно отзыва ───────────────────────────────────

function initReviewModal() {
  const modal = document.getElementById("review-modal");
  const form = document.getElementById("review-form");
  const closeButton = document.getElementById("review-close");
  const success = document.getElementById("review-success");
  const starsContainer = modal?.querySelector(".review-modal__stars");

  if (!modal) return;

  setupStars(starsContainer);

  let currentBook = null;

  document.querySelectorAll(".review-prompt__btn").forEach(button => {
    button.addEventListener("click", () => {
      const card = button.closest(".cabinet__card");
      if (!card) return;

      const cover = card.querySelector(".book-card__cover img");
      const title = card.querySelector(".book-card__title");
      const author = card.querySelector(".book-card__author");
      const promptStars = card.querySelector(".review-prompt__stars");

      currentBook = {
        title: title?.textContent.trim() || "",
        author: author?.textContent.trim() || "",
        cover: cover?.getAttribute("src") || ""
      };

      const modalCover = document.getElementById("review-modal-cover");
      const modalTitle = document.getElementById("review-modal-title");
      const modalAuthor = document.getElementById("review-modal-author");

      if (modalCover) {
        modalCover.src = currentBook.cover;
        modalCover.alt = currentBook.title;
      }

      if (modalTitle) modalTitle.textContent = currentBook.title;
      if (modalAuthor) modalAuthor.textContent = currentBook.author;

      form?.reset();

      if (form) form.style.display = "";
      if (success) success.style.display = "none";

      starsContainer?.setRating?.(promptStars?.getRating?.() || 0);
      openModal(modal);
    });
  });

  closeButton?.addEventListener("click", () => closeModal(modal));

  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal(modal);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal(modal);
  });

  form?.addEventListener("submit", event => {
    event.preventDefault();

    const rating = starsContainer?.getRating?.() || 0;

    if (!rating) {
      alert("Пожалуйста, выберите оценку книги");
      return;
    }

    const textarea = form.querySelector("textarea");
    const text = textarea?.value.trim() || "";

    if (!text) {
      alert("Напишите текст отзыва");
      return;
    }

    const reviews = readStorage("firebooks_reviews", []);

    reviews.push({
      ...currentBook,
      rating,
      text,
      authorName: getUserName() || "Гость",
      date: new Date().toISOString()
    });

    writeStorage("firebooks_reviews", reviews);

    form.style.display = "none";
    if (success) success.style.display = "block";

    setTimeout(() => {
      closeModal(modal);
      form.reset();
      form.style.display = "";
      if (success) success.style.display = "none";
    }, 2000);
  });
}

// ─── Корзина ─────────────────────────────────────────────────

function updateCartTotal() {
  const totalElement = document.getElementById("cart-total");
  if (!totalElement) return;

  let total = 0;

  document.querySelectorAll(".cart__item").forEach(item => {
    const checkbox = item.querySelector(".checkbox");
    if (checkbox && !checkbox.checked) return;

    const priceElement = item.querySelector(".cart__new-price");
    const quantityElement = item.querySelector(".cart__input");

    const price = priceNumber(priceElement?.textContent);
    const quantity = Math.max(1, Number(quantityElement?.value) || 1);

    total += price * quantity;
  });

  totalElement.textContent = total.toLocaleString("ru-RU") + " ₽";
}

function initCart() {
  const cartItems = document.querySelectorAll(".cart__item");
  if (!cartItems.length) return;

  document.querySelectorAll(".btn--quantity").forEach(button => {
    button.addEventListener("click", () => {
      const input = button.parentElement?.querySelector(".cart__input");
      if (!input) return;

      const current = Math.max(1, Number(input.value) || 1);

      input.value = button.dataset.action === "plus"
        ? current + 1
        : Math.max(1, current - 1);

      updateCartTotal();
    });
  });

  document.querySelectorAll(".cart__input").forEach(input => {
    input.addEventListener("change", () => {
      input.value = Math.max(1, Number(input.value) || 1);
      updateCartTotal();
    });
  });

  const selectAll = document.getElementById("select-all");

  function syncSelectAll() {
    if (!selectAll) return;

    const checkboxes = Array.from(
      document.querySelectorAll(".cart__item .checkbox")
    );

    selectAll.checked =
      checkboxes.length > 0 && checkboxes.every(box => box.checked);
  }

  selectAll?.addEventListener("change", () => {
    document.querySelectorAll(".cart__item .checkbox").forEach(box => {
      box.checked = selectAll.checked;
    });

    updateCartTotal();
  });

  document.querySelectorAll(".cart__item .checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      syncSelectAll();
      updateCartTotal();
    });
  });

  document.getElementById("remove-selected")?.addEventListener("click", () => {
    document.querySelectorAll(".cart__item .checkbox:checked").forEach(box => {
      box.closest(".cart__item")?.remove();
    });

    syncSelectAll();
    updateCartTotal();
  });

  document.getElementById("cart-checkout")?.addEventListener("click", () => {
    const items = [];

    document.querySelectorAll(".cart__item").forEach(item => {
      const checkbox = item.querySelector(".checkbox");
      if (checkbox && !checkbox.checked) return;

      const cover = item.querySelector("img");
      const title = item.querySelector(".cart__title");
      const author = item.querySelector(".cart__author");
      const price = item.querySelector(".cart__new-price");
      const quantity = item.querySelector(".cart__input");

      const amount = priceNumber(price?.textContent);

      items.push({
        cover: cover?.getAttribute("src") || "",
        title: title?.textContent.trim() || "",
        author: author?.textContent.trim() || "",
        price: amount,priceText: formatPrice(amount),
        quantity: Math.max(1, Number(quantity?.value) || 1)
      });
    });

    if (!items.length) {
      alert("Выберите товары для оформления");
      return;
    }

    writeStorage("firebooks_checkout", items);
    window.location.href = "/checkout";
  });

  syncSelectAll();
  updateCartTotal();
}

// ─── Поиск книг с живыми подсказками ─────────────────────────

function initSearch() {
  const selector = ".search__input";
  const initializedInputs = new WeakSet();
  let catalogPromise = null;

  // Ищем по всему каталогу: это позволяет находить книги независимо
  // от регистра русских букв и написания «е»/«ё».
  function normalizeSearch(value) {
    return String(value ?? "")
      .toLocaleLowerCase("ru")
      .replace(/ё/g, "е")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetch(`${API}/books`, {
        credentials: "same-origin"
      }).then(async response => {
        if (!response.ok) {
          throw new Error(`Ошибка каталога: ${response.status}`);
        }
        const books = await response.json();
        if (!Array.isArray(books)) {
          throw new Error("Каталог вернул неверный формат данных");
        }
        return books;
      }).catch(error => {
        catalogPromise = null; // разрешаем повторную попытку
        throw error;
      });
    }
    return catalogPromise;
  }

  // Стили касаются только выпадающих подсказок, а не шапки сайта.
  if (!document.getElementById("firebooks-live-search-style")) {
    const style = document.createElement("style");
    style.id = "firebooks-live-search-style";
    style.textContent = `
      .search-suggest.search-suggest--live {
        position: fixed !important;
        z-index: 2147483000 !important;
        box-sizing: border-box;
        background: #fffdf9;
        color: #342c27;
        border: 1px solid #e9e0d6;
        border-radius: 12px;
        box-shadow: 0 12px 32px rgba(39, 29, 20, .16);
        padding: 5px;
        max-height: min(55vh, 420px);
        overflow-y: auto;
        overscroll-behavior: contain;
        font-family: inherit;
      }
      .search-suggest--live .search-suggest__item {
        display: flex !important;
        width: 100%;
        align-items: center;
        gap: 12px;
        padding: 8px 10px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
        box-sizing: border-box;
      }
      .search-suggest--live .search-suggest__item:hover,
      .search-suggest--live .search-suggest__item:focus-visible,
      .search-suggest--live .search-suggest__item.is-active {
        background: #f4eee7;
        outline: none;
      }
      .search-suggest--live .search-suggest__cover {
        display: block;
        width: 42px;
        height: 58px;
        object-fit: cover;
        border-radius: 4px;
        flex: 0 0 42px;
      }
      .search-suggest--live .search-suggest__info {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: 3px;
      }
      .search-suggest--live .search-suggest__title,
      .search-suggest--live .search-suggest__author,
      .search-suggest--live .search-suggest__price {
        margin: 0;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }
      .search-suggest--live .search-suggest__title {
        font-size: 14px;
        font-weight: 650;
      }
      .search-suggest--live .search-suggest__author {
        font-size: 12px;
        opacity: .72;
      }
      .search-suggest--live .search-suggest__price {
        font-size: 13px;
        font-weight: 650;
      }
      .search-suggest--live .search-suggest__empty {
        padding: 13px 12px;
        font-size: 13px;
        line-height: 1.4;
      }
    `;
    document.head.appendChild(style);
  }

  function setupSearchInput(input){
    if (!input || initializedInputs.has(input)) return;
    initializedInputs.add(input);

    const form = input.closest("form");
    const searchArea = form || input.closest(".search") || input.parentElement;
    if (!searchArea) return;

    // Как и раньше, не оставляем в поиске заранее заданный текст.
    input.removeAttribute("value");
    input.value = "";

    // Браузерные подсказки не должны закрывать подсказки FIREBOOKS.
    input.setAttribute("autocomplete", "off");

    const suggestions = document.createElement("div");
    suggestions.className = "search-suggest search-suggest--live";
    suggestions.setAttribute("role", "listbox");
    suggestions.setAttribute("aria-label", "Найденные книги");
    suggestions.style.display = "none";

    // Размещаем список вне шапки, чтобы overflow/z-index её не обрезали.
    document.body.appendChild(suggestions);

    let debounceTimer = null;
    let searchVersion = 0;
    let matches = [];
    let activeIndex = -1;

    function isOpen() {
      return suggestions.style.display !== "none";
    }

    function positionSuggestions() {
      if (!isOpen()) return;
      const inputRect = input.getBoundingClientRect();
      const areaRect = searchArea.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const left = Math.max(8, Math.min(areaRect.left, viewportWidth - 208));
      const width = Math.min(
        Math.max(inputRect.width, areaRect.width, 200),
        viewportWidth - left - 8
      );

      suggestions.style.left = `${left}px`;
      suggestions.style.top = `${inputRect.bottom + 5}px`;
      suggestions.style.width = `${width}px`;
      suggestions.style.maxHeight = `${Math.max(90, window.innerHeight - inputRect.bottom - 16)}px`;
    }

    function hideSuggestions() {
      suggestions.style.display = "none";
      activeIndex = -1;
      input.setAttribute("aria-expanded", "false");
    }

    function openSuggestions() {
      suggestions.style.display = "block";
      input.setAttribute("aria-expanded", "true");
      positionSuggestions();
    }

    function showMessage(message) {
      suggestions.replaceChildren();
      matches = [];
      activeIndex = -1;
      const element = document.createElement("div");
      element.className = "search-suggest__empty";
      element.textContent = message;
      suggestions.appendChild(element);
      openSuggestions();
    }

    function navigateToBook(book) {
      if (book?.id == null) return;
      window.location.href = `/book?id=${encodeURIComponent(book.id)}`;
    }

    function renderMatches(books) {
      suggestions.replaceChildren();
      matches = books;
      activeIndex = -1;

      if (!books.length) {
        showMessage("Ничего не найдено");
        return;
      }

      books.forEach((book, index) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "search-suggest__item";
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", "false");
        item.dataset.index = String(index);

        const image = document.createElement("img");
        image.className = "search-suggest__cover";
        image.src = book.cover_url || "";
        image.alt = "";
        image.loading = "lazy";

        const info = document.createElement("div");
        info.className = "search-suggest__info";

        const title = document.createElement("p");
        title.className = "search-suggest__title";
        title.textContent = book.title || book.full_title || "Без названия";

        const author = document.createElement("p");
        author.className = "search-suggest__author";
        author.textContent = book.author || "";

        const price = document.createElement("p");
        price.className = "search-suggest__price";
        price.textContent = formatPrice(book.new_price);

        info.append(title, author, price);
        item.append(image, info);
        suggestions.appendChild(item);
      });

      openSuggestions();
    }

    function setActive(index) {
      activeIndex = index;
      suggestions.querySelectorAll(".search-suggest__item").forEach((item, i) => {
        const selected = i === index;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-selected", String(selected));
        if (selected) item.scrollIntoView({ block: "nearest" });
      });
    }

    function filterCatalog(books, query) {
      const q = normalizeSearch(query);
      const terms = q.split(" ").filter(Boolean);

      return books
        .filter(book => {
          const text = normalizeSearch(
            `${book.title || ""} ${book.full_title || ""} ${book.author || ""}`
          );
          return terms.every(term => text.includes(term));
        })
        .sort((a, b) => {
          function rank(book) {
            const title = normalizeSearch(book.title || book.full_title);
            const author = normalizeSearch(book.author);
            if (title === q) return 0;
            if (title.startsWith(q)) return 1;
            if (title.split(" ").some(word => word.startsWith(q))) return 2;
            if (title.includes(q)) return 3;
            if (author.startsWith(q)) return 4;
            return 5;
          }
          return rank(a) - rank(b);
        })
        .filter((book, index, array) =>
          array.findIndex(item => String(item.id) === String(book.id)) === index
        )
        .slice(0, 6);
    }

    async function runSearch(navigateIfSingle = false) {
      const query = input.value.trim();
      const version = ++searchVersion;

      if (!query) {
        hideSuggestions();
        return;
      }

      showMessage("Ищем книги...");

      try {
        let books;
        try {
          books = await getCatalog();
        } catch (catalogError) {
          // Если полный каталог временно недоступен, используем API поиска.
          const response = await fetch(
            `${API}/search?q=${encodeURIComponent(query)}`,
            { credentials: "same-origin" }
          );
          if (!response.ok) throw catalogError;
          books = await response.json();
          if (!Array.isArray(books)) throw catalogError;
        }

        if (version !== searchVersion || input.value.trim() !== query) return;
        const found = filterCatalog(books, query);
        if (navigateIfSingle && found.length === 1) {
          navigateToBook(found[0]);
          return;
        }
        renderMatches(found);
      } catch (error) {
        if (version !== searchVersion) return;
        console.error("Ошибка поиска FIREBOOKS:", error);
        showMessage("Не удалось выполнить поиск. Попробуйте ещё раз.");
      }
    }

    function scheduleSearch(delay = 100) {
      clearTimeout(debounceTimer);
      ++searchVersion; // устаревший ответ больше не попадёт в подсказки

      if (!input.value.trim()) {
        hideSuggestions();
        return;
      }

      debounceTimer = setTimeout(runSearch, delay);
    }

    input.addEventListener("input", () => scheduleSearch(100));
    input.addEventListener("focus", () => {
      if (input.value.trim()) scheduleSearch(0);
    });

    input.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        hideSuggestions();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (!matches.length || !isOpen()) return;
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setActive((activeIndex + direction + matches.length) % matches.length);
        return;
      }

      if (event.key === "Enter" && isOpen() && activeIndex >= 0) {
        event.preventDefault();
        navigateToBook(matches[activeIndex]);
      }
    });

    // Перехватываем отправку формы, чтобы /search не возвращал на главную.
    if (form) {
      form.addEventListener("submit", event => {
        event.preventDefault();
        clearTimeout(debounceTimer);

        if (!input.value.trim()) {
          hideSuggestions();
          input.focus();
          return;
        }

        if (isOpen() && activeIndex >= 0 && matches[activeIndex]) {
          navigateToBook(matches[activeIndex]);
          return;
        }

        // При единственном результате Enter открывает книгу.
        // Если совпадений несколько — показывает выбор в подсказках.
        if (isOpen() && matches.length === 1) {
          navigateToBook(matches[0]);
          return;
        }

        runSearch(true);
        input.focus();
      });
    }

    if (!form) {
      input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (isOpen() && matches.length === 1) {
            navigateToBook(matches[0]);
          } else {
            runSearch(true);
          }
        }
      });
    }

    suggestions.addEventListener("click", event => {
      const item = event.target.closest(".search-suggest__item");
      if (!item) return;
      navigateToBook(matches[Number(item.dataset.index)]);
    });

    document.addEventListener("pointerdown", event => {
      if (!searchArea.contains(event.target) && !suggestions.contains(event.target)) {
        hideSuggestions();
      }
    });

    window.addEventListener("resize", positionSuggestions);
    window.addEventListener("scroll", positionSuggestions, true);
  }

  document.querySelectorAll(selector).forEach(setupSearchInput);

  // Подключаем также поле мобильного поиска, если оно появится позднее.
  document.addEventListener("focusin", event => {
    if (event.target.matches?.(selector)) setupSearchInput(event.target);
  });

  // Начинаем загрузку каталога заранее, чтобы подсказки появлялись быстрее.
  if (document.querySelector(selector)) {
    getCatalog().catch(error => {
      console.warn("Предварительная загрузка поиска не удалась:", error);
    });
  }
}

// ─── Запуск ──────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  loadHero();

  loadSection("/books/new", "grid-new");
  loadSection("/books/bestsellers", "grid-bestsellers");
  loadSection("/books/upcoming", "grid-upcoming");

  // Информацию о пользователе теперь загружает auth_frontend.js.

  initBookCardClicks();
  initToggleButtons();
  initReviewPrompts();
  initReviewModal();
  initCart();
  initSearch();

  loadFavorites();
});