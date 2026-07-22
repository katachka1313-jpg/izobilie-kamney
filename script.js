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

const scrollToExamplesOnInitialLoad = () => {
  if (window.location.hash) {
    return;
  }

  const examplesSection = document.querySelector("#examples");

  if (!examplesSection) {
    return;
  }

  const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
  const targetTop = examplesSection.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
  const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.scrollTo({
    top: Math.max(targetTop, 0),
    behavior: shouldReduceMotion ? "auto" : "smooth",
  });
};

window.addEventListener("load", () => {
  window.requestAnimationFrame(scrollToExamplesOnInitialLoad);
});

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


document.querySelectorAll("[data-works-carousel]").forEach((carousel) => {
  const track = carousel.querySelector(".works-carousel-track");
  const cards = Array.from(carousel.querySelectorAll(".work-card"));
  const prev = carousel.querySelector("[data-works-prev]");
  const next = carousel.querySelector("[data-works-next]");

  if (!track || cards.length === 0) {
    return;
  }

  const getStep = () => {
    const firstCard = cards[0];
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
    return firstCard.getBoundingClientRect().width + gap;
  };

  const scrollByCard = (direction) => {
    track.scrollBy({ left: getStep() * direction, behavior: "smooth" });
  };

  prev?.addEventListener("click", () => scrollByCard(-1));
  next?.addEventListener("click", () => scrollByCard(1));
});

document.querySelectorAll("[data-stones-carousel]").forEach((carousel) => {
  const track = carousel.querySelector(".stones-carousel-track");
  const slides = Array.from(carousel.querySelectorAll(".stones-carousel-slide"));
  const dots = Array.from(carousel.querySelectorAll("[data-stones-dot]"));
  const prev = carousel.querySelector("[data-stones-prev]");
  const next = carousel.querySelector("[data-stones-next]");

  if (!track || slides.length === 0) {
    return;
  }

  let activeIndex = 0;

  const updateDots = (index) => {
    activeIndex = Math.max(0, Math.min(index, slides.length - 1));
    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === activeIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });
  };

  const scrollToSlide = (index) => {
    const nextIndex = (index + slides.length) % slides.length;
    const left = slides[nextIndex].offsetLeft - track.offsetLeft;
    track.scrollTo({ left, behavior: "smooth" });
    updateDots(nextIndex);
  };

  const findClosestSlide = () => {
    const trackLeft = track.getBoundingClientRect().left;
    return slides.reduce((closestIndex, slide, index) => {
      const slideLeft = slide.getBoundingClientRect().left;
      const closestLeft = slides[closestIndex].getBoundingClientRect().left;
      return Math.abs(slideLeft - trackLeft) < Math.abs(closestLeft - trackLeft) ? index : closestIndex;
    }, 0);
  };

  prev?.addEventListener("click", () => scrollToSlide(activeIndex - 1));
  next?.addEventListener("click", () => scrollToSlide(activeIndex + 1));

  dots.forEach((dot) => {
    dot.addEventListener("click", () => scrollToSlide(Number(dot.dataset.stonesDot)));
  });

  track.addEventListener("scroll", () => {
    window.requestAnimationFrame(() => updateDots(findClosestSlide()));
  }, { passive: true });

  track.scrollTo({ left: 0 });
  updateDots(0);
});

const requestForm = document.querySelector("#request-form");
const requestError = document.querySelector("#request-error");
const phoneInput = requestForm?.querySelector('input[name="phone"]');

const formatRussianPhone = (value) => {
  const digits = value.replace(/\D/g, "");
  const withoutCountryCode = digits.replace(/^8/, "").replace(/^7/, "").slice(0, 10);
  const area = withoutCountryCode.slice(0, 3);
  const first = withoutCountryCode.slice(3, 6);
  const second = withoutCountryCode.slice(6, 8);
  const third = withoutCountryCode.slice(8, 10);

  let formatted = "+7";

  if (area) {
    formatted += `(${area}`;
  }

  if (area.length === 3) {
    formatted += ")";
  }

  if (first) {
    formatted += ` ${first}`;
  }

  if (second) {
    formatted += `-${second}`;
  }

  if (third) {
    formatted += `-${third}`;
  }

  return formatted;
};

if (phoneInput instanceof HTMLInputElement) {
  phoneInput.addEventListener("input", () => {
    phoneInput.value = formatRussianPhone(phoneInput.value);
  });

  phoneInput.addEventListener("focus", () => {
    if (!phoneInput.value) {
      phoneInput.value = "+7";
    }
  });
}

if (requestForm instanceof HTMLFormElement) {
  requestForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!requestForm.checkValidity()) {
      if (requestError) {
        requestError.textContent = "Пожалуйста, заполните все обязательные поля.";
      }
      requestForm.reportValidity();
      return;
    }

    const formData = new FormData(requestForm);
    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const additionalContact = String(formData.get("additional_contact") || "").trim();
    const jewelry = String(formData.get("jewelry") || "").trim();
    const recipient = String(formData.get("recipient") || "").trim();
    const furniture = String(formData.get("furniture") || "").trim();
    const birthdate = String(formData.get("birthdate") || "").trim();
    const size = String(formData.get("size") || "").trim();
    const color = String(formData.get("color") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (requestError) {
      requestError.textContent = "";
    }

    const lines = [
      "Новая заявка с сайта “Изобилие из камней”",
      "",
      `Имя: ${name}`,
      `Телефон для связи: ${phone}`,
      `Дополнительный контакт: ${additionalContact}`,
      `Что хочет заказать: ${jewelry}`,
      `Для кого: ${recipient}`,
      `Фурнитура: ${furniture}`,
      `Размер: ${size}`,
      `Цвет/оттенки: ${color}`,
      `Дата рождения: ${birthdate}`,
      `Пожелания: ${message}`,
    ];

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

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersReducedMotion) {
  const revealItems = Array.from(document.querySelectorAll(
    ".section:not(.hero), .option-card, .format-card, .stone-wide-note, .work-card, .examples-note, .memory-note, .measure-card, .size-guide-card, .care-card, .step-card, .payment-card, .contact-card"
  ));

  revealItems.forEach((item, index) => {
    item.classList.add("reveal-on-scroll");

    if (item.matches(".option-card, .format-card, .work-card, .measure-card, .size-guide-card, .care-card, .step-card, .payment-card")) {
      item.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 55}ms`);
    }
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: "0px 0px -40px 0px",
  });

  revealItems.forEach((item) => revealObserver.observe(item));
}
