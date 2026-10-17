"use strict";

// Каталог FIREBOOKS
// Использует готовые функции из script.js.

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("catalog-grid");
  const searchInput = document.getElementById("catalog-query");
  const genreSelect = document.getElementById("catalog-genre");
  const sortSelect = document.getElementById("catalog-sort");
  const countElement = document.getElementById("catalog-count");
  const emptyElement = document.getElementById("catalog-empty");

  if (!grid) return;

  let allBooks = [];

  // Жанр может храниться под разными именами.
  function getGenre(book) {
    const value = book.genre ?? book.category ?? book.genres;

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    return String(value ?? "").trim();
  }

  function getPrice(book) {
    return Number(
      String(book.new_price ?? 0)
        .replace(/[^\d.,]/g, "")
        .replace(",", ".")
    ) || 0;
  }

  function renderBooks() {
    const query = searchInput.value.trim().toLocaleLowerCase("ru");
    const genre = genreSelect.value;
    const sorting = sortSelect.value;

    let books = allBooks.filter(book => {
      const searchable = [
        book.title,
        book.full_title,
        book.author
      ].join(" ").toLocaleLowerCase("ru");

      const matchesSearch = searchable.includes(query);
      const matchesGenre =
        !genre || getGenre(book) === genre;

      return matchesSearch && matchesGenre;
    });

    books = [...books];

    if (sorting === "price-asc") {
      books.sort((a, b) => getPrice(a) - getPrice(b));
    }

    if (sorting === "price-desc") {
      books.sort((a, b) => getPrice(b) - getPrice(a));
    }

    if (sorting === "title") {
      books.sort((a, b) =>
        String(a.full_title || a.title || "")
          .localeCompare(
            String(b.full_title || b.title || ""),
            "ru"
          )
      );
    }

    grid.innerHTML = books.map(bookCardHTML).join("");

    // Сохраняем работу существующего избранного.
    syncFavoriteButtons(grid);

    countElement.textContent = `Найдено книг: ${books.length}`;
    emptyElement.hidden = books.length !== 0;
  }

  async function loadCatalog() {
    skeletonCards(grid, 10);

    try {
      const response = await fetch("/api/books");

      if (!response.ok) {
        throw new Error(`Ошибка загрузки: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Сервер вернул неверный формат книг");
      }

      allBooks = data;

      const genres = [...new Set(
        allBooks.map(getGenre).filter(Boolean)
      )].sort((a, b) => a.localeCompare(b, "ru"));

      genres.forEach(genre => {
        const option = document.createElement("option");
        option.value = genre;
        option.textContent = genre;
        genreSelect.appendChild(option);
      });

      // Если жанры отсутствуют в API, не показываем
      // неработающий фильтр.
      if (!genres.length) {
        genreSelect.hidden = true;
      }

      const urlQuery =
        new URLSearchParams(window.location.search).get("q");

      if (urlQuery) {
        searchInput.value = urlQuery;
      }

      renderBooks();

    } catch (error) {
      console.error("Ошибка каталога:", error);

      grid.replaceChildren();
      countElement.textContent = "Ошибка загрузки";
      emptyElement.textContent =
        "Не удалось загрузить книги. Попробуйте обновить страницу.";
      emptyElement.hidden = false;
    }
  }

  searchInput.addEventListener("input", renderBooks);
  genreSelect.addEventListener("change", renderBooks);
  sortSelect.addEventListener("change", renderBooks);

  loadCatalog();
});