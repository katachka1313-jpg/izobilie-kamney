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

const FORM_ENDPOINT = "https://izobilie-kamney-form.katachka1313.workers.dev/";

const requestForm = document.querySelector("#request-form");
const requestStatus = document.querySelector("#request-status");
const phoneInput = requestForm?.querySelector('input[name="phone"]');
const birthDateInput = requestForm?.querySelector('input[name="birthdate"]');
const contactMethodInput = requestForm?.querySelector('select[name="contact_method"]');
const telegramContactInput = requestForm?.querySelector('input[name="telegram_contact"]');
const maxContactInput = requestForm?.querySelector('input[name="max_contact"]');
const telegramContactField = document.querySelector("#telegram-contact-field");
const maxContactField = document.querySelector("#max-contact-field");

const formatRussianPhone = (value) => {
  const digits = value.replace(/\D/g, "");
  const withoutCountryCode = digits.replace(/^8/, "").replace(/^7/, "").slice(0, 10);
  const area = withoutCountryCode.slice(0, 3);
  const first = withoutCountryCode.slice(3, 6);
  const second = withoutCountryCode.slice(6, 8);
  const third = withoutCountryCode.slice(8, 10);

  let formatted = "+7";

  if (area) {
    formatted += ` (${area}`;
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

const formatBirthDate = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);

  return parts.join(".");
};

const isValidBirthDate = (value) => {
  if (!value) {
    return true;
  }

  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);

  if (!match) {
    return false;
  }

  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day);
};

const setRequestStatus = (message, type = "") => {
  if (!requestStatus) {
    return;
  }

  requestStatus.textContent = message;
  requestStatus.classList.toggle("is-success", type === "success");
};

const buildRequestPayload = (form) => {
  const formData = new FormData(form);

  return {
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    contactMethod: String(formData.get("contact_method") || "").trim(),
    telegram: String(formData.get("telegram_contact") || "").trim(),
    max: String(formData.get("max_contact") || "").trim(),
    productType: String(formData.get("jewelry") || "").trim(),
    recipient: String(formData.get("recipient") || "").trim(),
    hardware: String(formData.get("furniture") || "").trim(),
    size: String(formData.get("size") || "").trim(),
    colors: String(formData.get("color") || "").trim(),
    birthDate: String(formData.get("birthdate") || "").trim(),
    wishes: String(formData.get("message") || "").trim(),
    page: window.location.href,
    createdAt: new Date().toISOString(),
  };
};

const updateConditionalContactFields = () => {
  const method = contactMethodInput instanceof HTMLSelectElement ? contactMethodInput.value : "";
  const usesTelegram = method === "telegram";
  const usesMax = method === "max";

  if (telegramContactField instanceof HTMLElement && telegramContactInput instanceof HTMLInputElement) {
    telegramContactField.hidden = !usesTelegram;
    telegramContactInput.required = usesTelegram;
    telegramContactInput.disabled = !usesTelegram;
  }

  if (maxContactField instanceof HTMLElement && maxContactInput instanceof HTMLInputElement) {
    maxContactField.hidden = !usesMax;
    maxContactInput.required = usesMax;
    maxContactInput.disabled = !usesMax;
  }
};

if (contactMethodInput instanceof HTMLSelectElement) {
  contactMethodInput.addEventListener("change", updateConditionalContactFields);
  updateConditionalContactFields();
}

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

if (birthDateInput instanceof HTMLInputElement) {
  birthDateInput.addEventListener("input", () => {
    birthDateInput.value = formatBirthDate(birthDateInput.value);
    birthDateInput.setCustomValidity("");
  });

  birthDateInput.addEventListener("blur", () => {
    birthDateInput.setCustomValidity(
      isValidBirthDate(birthDateInput.value) ? "" : "Введите существующую дату в формате ДД.ММ.ГГГГ.",
    );
  });
}

if (requestForm instanceof HTMLFormElement) {
  requestForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (birthDateInput instanceof HTMLInputElement) {
      birthDateInput.value = formatBirthDate(birthDateInput.value);
      birthDateInput.setCustomValidity(
        isValidBirthDate(birthDateInput.value) ? "" : "Введите существующую дату в формате ДД.ММ.ГГГГ.",
      );
    }

    if (!requestForm.checkValidity()) {
      setRequestStatus("Пожалуйста, заполните все обязательные поля.");
      requestForm.reportValidity();
      return;
    }

    const submitButton = requestForm.querySelector('button[type="submit"]');
    const payload = buildRequestPayload(requestForm);

    setRequestStatus("Отправляю заявку…");

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Не удалось отправить заявку. Пожалуйста, попробуйте ещё раз или напишите мне в Telegram / MAX.");
      }

      setRequestStatus("Спасибо! Заявка отправлена. Я свяжусь с вами в ближайшее время.", "success");
      requestForm.reset();
      updateConditionalContactFields();
    } catch (error) {
      console.error("Order form submission failed", error);
      setRequestStatus(error instanceof Error ? error.message : "Не удалось отправить заявку. Пожалуйста, попробуйте ещё раз или напишите мне в Telegram / MAX.");
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
    }
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

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

if (!reducedMotionQuery.matches && "IntersectionObserver" in window) {
  const revealSelector = [
    ".section-heading",
    ".about-brand-logo",
    ".about-copy",
    ".option-card",
    ".format-card",
    ".format-actions",
    ".stones-carousel",
    ".stone-wide-note",
    ".soft-note",
    ".work-card",
    ".examples-note",
    ".memory-note",
    ".measure-card",
    ".size-guide-card",
    ".care-card",
    ".step-card",
    ".order-wish",
    ".request-form",
    ".contacts > div",
  ].join(", ");
  const staggeredSelector = [
    ".option-card",
    ".format-card",
    ".work-card",
    ".measure-card",
    ".size-guide-card",
    ".care-card",
    ".step-card",
  ].join(", ");
  const revealItems = Array.from(document.querySelectorAll(revealSelector));
  const groupPositions = new Map();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

  revealItems.forEach((item) => {
    // Keep everything already on the first screen visible without a flash or delay.
    const bounds = item.getBoundingClientRect();
    if (bounds.top >= viewportHeight || bounds.bottom <= 0) {
      item.classList.add("reveal-on-scroll");
    }

    if (item.matches(staggeredSelector) && item.parentElement) {
      const position = groupPositions.get(item.parentElement) || 0;
      item.style.setProperty("--reveal-delay", `${Math.min(position, 5) * 50}ms`);
      groupPositions.set(item.parentElement, position + 1);
    }
  });

  // Until this class is added, CSS leaves all content visible (including without JS).
  document.documentElement.classList.add("animations-ready");

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);

      // Remove the animation helpers afterwards so they cannot override hover effects.
      const finishReveal = () => {
        entry.target.classList.remove("reveal-on-scroll", "is-visible");
        entry.target.style.removeProperty("--reveal-delay");
      };
      entry.target.addEventListener("transitionend", finishReveal, { once: true });
      window.setTimeout(finishReveal, 1100);
    });
  }, {
    threshold: 0.01,
    rootMargin: "0px 0px -8% 0px",
  });

  revealItems.forEach((item) => {
    if (item.classList.contains("reveal-on-scroll")) {
      revealObserver.observe(item);
    }
  });
}
