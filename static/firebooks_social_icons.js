/* FIREBOOKS — единые иконки социальных сетей */

(() => {
  "use strict";

  const icons = {
    VK: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.8 17.4c-5.5 0-8.7-3.8-8.9-10.1h2.8c.1 4.6 2.1 6.5 3.7 6.9V7.3H13v3.9c1.6-.2 3.3-2 3.9-3.9h2.8c-.5 2.4-2.5 4.2-3.9 5 1.4.6 3.6 2.2 4.4 5.1h-3.1c-.7-2-2.2-3.5-4.1-3.7v3.7h-.2z"/>
      </svg>
    `,
    TG: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.4 4.6 18.2 19.7c-.2 1.1-.8 1.4-1.7.9l-4.7-3.5-2.3 2.2c-.3.3-.6.5-1.1.5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.3L6 13.2l-4.5-1.4c-1-.3-1-1 .2-1.5L19.5 3c1-.4 2.2.2 1.9 1.6z"/>
      </svg>
    `,
    TT: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16.7 2h-3.1v13.3a3.1 3.1 0 1 1-2.7-3.1V9.1a6.2 6.2 0 1 0 5.8 6.2V8.6a8 8 0 0 0 4.7 1.5V7a4.9 4.9 0 0 1-4.7-5z"/>
      </svg>
    `,
    YT: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.6 7.1a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.4a2.7 2.7 0 0 0-1.9 1.9C2 8.8 2 12 2 12s0 3.2.4 4.9a2.7 2.7 0 0 0 1.9 1.9c1.7.4 7.7.4 7.7.4s6 0 7.7-.4a2.7 2.7 0 0 0 1.9-1.9c.4-1.7.4-4.9.4-4.9s0-3.2-.4-4.9zM10 15.5v-7l6 3.5-6 3.5z"/>
      </svg>
    `
  };

  const names = {
    VK: "ВКонтакте",
    TG: "Telegram",
    TT: "TikTok",
    YT: "YouTube"
  };

  function updateSocialIcons() {
    document.querySelectorAll(
      ".footer__socials .social"
    ).forEach(link => {
      const key = link.textContent.trim().toUpperCase();

      if (!icons[key]) return;

      link.innerHTML = icons[key];
      link.setAttribute("aria-label", names[key]);
      link.setAttribute("title", names[key]);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      updateSocialIcons
    );
  } else {
    updateSocialIcons();
  }
})();