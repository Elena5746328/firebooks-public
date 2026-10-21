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

  /* Десять информационных разделов */
  document.querySelectorAll(
    ".footer__list a"
  ).forEach(link => {
    const label = link.textContent
      .replace(/\s+/g, " ")
      .trim();

    if (Object.prototype.hasOwnProperty.call(
      sections, label
    )) {
      link.href = "/info?section=" + sections[label];
    }
  });

  /* Ссылка на рекомендательные технологии */
  document.querySelectorAll(
    ".footer__copyright"
  ).forEach(element => {
    const text = element.textContent;

    const phrase =
      "На информационном ресурсе применяются рекомендательные технологии";

    if (element.querySelector('a[href="/recommend"]')) {
      return;
    }

    const match = text.match(
      /На\s+информационном\s+ресурсе\s+применяются\s+рекомендательные\s+технологии/i
    );

    const index = match ? match.index : -1;

    const before = text.slice(0, index);
    const matched = match[0];
    const after = text.slice(index + matched.length);

    element.textContent = before;

    const link = document.createElement("a");
    link.href = "/recommend";
    link.textContent = matched;
    link.className = "footer__recommend-link";

    element.appendChild(link);
    element.appendChild(
      document.createTextNode(after)
    );
  });
})();

/* Подключаем общие иконки социальных сетей */

if (!document.querySelector(
  'script[data-firebooks-social-icons]'
)) {
  const script = document.createElement("script");
  script.src = "/static/firebooks_social_icons.js";
  script.dataset.firebooksSocialIcons = "true";
  document.body.appendChild(script);
}