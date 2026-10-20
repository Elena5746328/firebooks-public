/* FIREBOOKS — рабочие ссылки подвала */

(() => {
  "use strict";

  const sections = {
    "О FIREBOOKS": "about",
    "Политика конфиденциальности": "privacy",
    "Вакансии": "careers",
    "Программа лояльности": "loyalty",
    "Подарочные сертификаты": "gift-cards",
    "Оплата и доставка": "delivery",
    "Правила возврата": "returns",
    "Контакты и реквизиты": "contacts",
    "Помощь и ответы на вопросы": "faq",
    "Обратная связь": "feedback"
  };

  document.querySelectorAll(".footer__list a").forEach(
    link => {
      const label = link.textContent
        .replace(/\s+/g, " ")
        .trim();

      if (
        Object.prototype.hasOwnProperty.call(
          sections,
          label
        )
      ) {
        link.href = "/info?section=" + sections[label];
      }
    }
  );
})();