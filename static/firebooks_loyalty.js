/* FIREBOOKS — карта любимого покупателя */

(() => {
  "use strict";

  const card = document.querySelector(".loyalty-card");

  if (!card) return;

  const balanceElement = card.querySelector(
    ".loyalty-card__bonus-current"
  );

  const pendingElement = card.querySelector(
    ".loyalty-card__bonus-pending"
  );

  const hintElement = card.querySelector(
    ".loyalty-card__hint"
  );

  const values = card.querySelectorAll(
    ".loyalty-card__stat-value"
  );

  const labels = card.querySelectorAll(
    ".loyalty-card__stat-label"
  );

  const formatNumber = number =>
    new Intl.NumberFormat("ru-RU").format(number);

  async function loadLoyalty() {
    try {
      const response = await fetch(
        "/api/orders/loyalty",
        {
          credentials: "same-origin",
          cache: "no-store"
        }
      );

      if (response.status === 401) {
        if (balanceElement) {
          balanceElement.textContent = "0 бонусов";
        }

        if (pendingElement) {
          pendingElement.textContent =
            "Войдите в аккаунт";
        }

        return;
      }

      if (!response.ok) {
        throw new Error("Ошибка загрузки бонусов");
      }

      const data = await response.json();

      const balance = Number(data.balance) || 0;
      const percent = Number(data.percent) || 0;
      const purchases =
        Number(data.purchases_total) || 0;

      if (balanceElement) {
        balanceElement.textContent =
          `${formatNumber(balance)} бонусов`;
      }

      if (pendingElement) {
        pendingElement.textContent =
          balance > 0
            ? "Спасибо за ваши заказы!"
            : "Бонусы пока не начислены";
      }

      if (hintElement) {
        hintElement.textContent =
          "Получайте 5% бонусами за оформление " +
          "заказов. Пока баллы нельзя " +
          "использовать для оплаты.";
      }

      if (values[0]) {
        values[0].textContent = `${percent}%`;
      }

      if (values[1]) {
        values[1].textContent =
          `${formatNumber(purchases)} ₽`;
      }

      if (labels[1]) {
        labels[1].textContent =
          "Сумма оформленных заказов";
      }

    } catch (error) {
      console.error(
        "Не удалось загрузить бонусы:",
        error
      );

      if (pendingElement) {
        pendingElement.textContent =
          "Не удалось загрузить бонусы";
      }
    }
  }

  loadLoyalty();

  document.addEventListener(
    "firebooks:auth-changed",
    loadLoyalty
  );
})();