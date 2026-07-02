const navToggle = document.querySelector(".nav-toggle");
const mainNav = document.querySelector(".main-nav");

if (navToggle && mainNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  mainNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      mainNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

document.querySelectorAll("[data-carousel]").forEach((carousel) => {
  const images = Array.from(carousel.querySelectorAll("img"));
  const dots = Array.from(carousel.querySelectorAll(".carousel-dots span"));
  const prev = carousel.querySelector(".carousel-prev");
  const next = carousel.querySelector(".carousel-next");
  let activeIndex = 0;

  const showImage = (index) => {
    activeIndex = (index + images.length) % images.length;
    images.forEach((image, imageIndex) => {
      image.classList.toggle("is-active", imageIndex === activeIndex);
    });
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === activeIndex);
    });
  };

  prev?.addEventListener("click", () => showImage(activeIndex - 1));
  next?.addEventListener("click", () => showImage(activeIndex + 1));
});

const requestForm = document.querySelector("#request-form");
const requestError = document.querySelector("#request-error");

if (requestForm instanceof HTMLFormElement) {
  requestForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(requestForm);
    const name = String(formData.get("name") || "").trim();
    const contact = String(formData.get("contact") || "").trim();
    const jewelry = String(formData.get("jewelry") || "").trim();
    const recipient = String(formData.get("recipient") || "").trim();
    const furniture = String(formData.get("furniture") || "").trim();
    const birthdate = String(formData.get("birthdate") || "").trim();
    const size = String(formData.get("size") || "").trim();
    const color = String(formData.get("color") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const consent = formData.get("consent");

    if (!name || !contact) {
      if (requestError) {
        requestError.textContent = "Пожалуйста, заполните имя и контакт для связи.";
      }
      return;
    }

    if (!consent) {
      if (requestError) {
        requestError.textContent = "Пожалуйста, подтвердите согласие на обработку персональных данных.";
      }
      return;
    }

    if (requestError) {
      requestError.textContent = "";
    }

    const lines = [
      "Новая заявка с сайта “Изобилие из камней”",
      "",
      `Имя: ${name}`,
      `Контакт: ${contact}`,
      `Что хочет заказать: ${jewelry}`,
      `Для кого: ${recipient}`,
      `Размер: ${size || "не указан"}`,
      `Фурнитура: ${furniture || "не указана"}`,
      `Дата рождения: ${birthdate || "не указана"}`,
      `Цвет / цветовая гамма: ${color || "не указана"}`,
      `Пожелания: ${message || "не указаны"}`,
    ].filter(Boolean);

    const telegramUrl = `https://t.me/OLESIA_CHUKOMINA?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(telegramUrl, "_blank", "noopener");
  });
}

const cookieBanner = document.querySelector("#cookie-banner");
const cookieAccept = document.querySelector("#cookie-accept");
const cookieStorageKey = "kamni-olesia-cookie-accepted";

if (cookieBanner && cookieAccept) {
  const isAccepted = localStorage.getItem(cookieStorageKey) === "true";

  if (!isAccepted) {
    cookieBanner.hidden = false;
  }

  cookieAccept.addEventListener("click", () => {
    localStorage.setItem(cookieStorageKey, "true");
    cookieBanner.hidden = true;
  });
}
