/*
  FIREBOOKS — управление оформлением баннеров.
  Основной script.js продолжает управлять
  переключением книг, текстом и ссылками.
*/

(() => {
  "use strict";

  // Оригинальные обложки
  const covers = [
    "/static/img/e9c52af3f897a42c929de5c1ddc4aa18.jpg",
    "/static/img/018f5f49-ad94-7e7d-bf28-6eb3c86740b0.png",
    "/static/img/019c08a2-b492-7bfa-8af7-8da0e8c5ff85.png"
  ];

  const names = [
    "Четвёртое крыло",
    "Академия вампиров",
    "Гордость и предубеждение"
  ];

  function init() {
    const banner = document.querySelector(
      ".hero .hero__inner"
    );

    const cover = document.getElementById(
      "hero-cover"
    );

    const dots = [
      ...document.querySelectorAll(
        ".hero__dots .dot"
      )
    ];

    if (!banner || !cover || dots.length !== 3) {
      return;
    }

    function update() {
      const active = dots.findIndex(dot =>
        dot.classList.contains("dot--active")
      );

      const index = active < 0 ? 0 : active;

      // Переключаем фон и цвета
      banner.dataset.fbSlide = String(index + 1);

      // Подставляем оригинальную обложку
      if (cover.getAttribute("src") !== covers[index]) {
        cover.setAttribute("src", covers[index]);
      }

      cover.alt =
        `Обложка книги «${names[index]}»`;
    }

    // Следим за изменением активного слайда
    const observer = new MutationObserver(update);

    dots.forEach(dot => {
      observer.observe(dot, {
        attributes: true,
        attributeFilter: ["class"]
      });
    });

    // Если основной script.js меняет обложку,
    // возвращаем выбранное оригинальное издание
    observer.observe(cover, {
      attributes: true,
      attributeFilter: ["src"]
    });

    update();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();