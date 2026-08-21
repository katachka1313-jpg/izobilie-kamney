const TELEGRAM_API_BASE_URL = "https://api.telegram.org";
const MAX_API_BASE_URL = "https://platform-api.max.ru";

const ALLOWED_ORIGINS = new Set([
  "https://izobiliekamney.ru",
  "https://www.izobiliekamney.ru",
]);

const REQUIRED_FIELDS = ["name", "phone", "contactMethod", "productType", "hardware", "size"];
const FIELD_LIMITS = {
  name: 100,
  phone: 30,
  contactMethod: 20,
  telegram: 200,
  max: 200,
  productType: 100,
  recipient: 100,
  birthDate: 20,
  hardware: 100,
  size: 100,
  colors: 200,
  wishes: 1000,
};
const RUSSIAN_PHONE_PATTERN = /^\+7\d{10}$/;
const CONTACT_METHODS = { telegram: "Telegram", max: "MAX", phone: "По телефону" };
const BIRTH_DATE_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})$/;

const getCorsHeaders = (request) => {
  const origin = request.headers.get("Origin");

  return {
    ...(ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
};

const jsonResponse = (request, payload, status = 200, additionalHeaders = {}) => new Response(
  JSON.stringify(payload),
  {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      ...getCorsHeaders(request),
      ...additionalHeaders,
    },
  },
);

const errorResponse = (request, error, status) => jsonResponse(request, { success: false, error }, status);

const normalizeBirthDate = (value) => {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    return "";
  }

  const digits = trimmedValue.replace(/\D/g, "");

  return digits.length === 8
    ? `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
    : trimmedValue;
};

const isValidBirthDate = (value) => {
  if (!value) {
    return true;
  }

  const match = BIRTH_DATE_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day);
};

const escapeHtml = (value) => String(value || "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const displayValue = (value) => escapeHtml(String(value || "").trim() || "Не указано");
const displayTextValue = (value) => String(value || "").trim() || "Не указано";

const normalizeRussianPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  const nationalNumber = digits.length === 11 && /^[78]/.test(digits) ? digits.slice(1) : digits;
  return nationalNumber.length === 10 ? `+7${nationalNumber}` : "";
};

const telegramProfileUrl = (contact) => {
  const value = String(contact || "").trim();
  const username = /^@([a-zA-Z0-9_]{5,32})$/.exec(value);

  if (username) return `https://t.me/${username[1]}`;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.toLowerCase() === "t.me" ? url.toString() : "";
  } catch {
    return "";
  }
};

const telegramContactLine = (data) => {
  if (data.contactMethod !== "telegram") return [];
  const url = telegramProfileUrl(data.telegram);
  const contact = displayValue(data.telegram);
  return [`<b>Telegram:</b> ${url ? `<a href="${escapeHtml(url)}">${contact}</a>` : contact}`];
};

const maxContactLine = (data) => data.contactMethod === "max"
  ? [`MAX: ${displayTextValue(data.max)}`]
  : [];

const buildTelegramMessage = (data) => [
  "💎 <b>Новая заявка</b>",
  "",
  `<b>Имя:</b> ${displayValue(data.name)}`,
  `<b>Телефон:</b> ${displayValue(normalizeRussianPhone(data.phone))}`,
  `<b>Удобный способ связи:</b> ${displayValue(CONTACT_METHODS[data.contactMethod])}`,
  ...telegramContactLine(data),
  ...(data.contactMethod === "max" ? [`<b>MAX:</b> ${displayValue(data.max)}`] : []),
  `<b>Что хочет заказать:</b> ${displayValue(data.productType)}`,
  `<b>Для кого:</b> ${displayValue(data.recipient)}`,
  `<b>Дата рождения:</b> ${displayValue(data.birthDate)}`,
  `<b>Фурнитура:</b> ${displayValue(data.hardware)}`,
  `<b>Размер:</b> ${displayValue(data.size)}`,
  `<b>Цвет:</b> ${displayValue(data.colors)}`,
  `<b>Пожелания:</b> ${displayValue(data.wishes)}`,
].join("\n");

const buildMaxMessage = (data) => [
  "💎 Новая заявка",
  "",
  `Имя: ${displayTextValue(data.name)}`,
  `Телефон: ${displayTextValue(normalizeRussianPhone(data.phone))}`,
  `Удобный способ связи: ${displayTextValue(CONTACT_METHODS[data.contactMethod])}`,
  ...(data.contactMethod === "telegram" ? [`Telegram: ${telegramProfileUrl(data.telegram) || displayTextValue(data.telegram)}`] : []),
  ...maxContactLine(data),
  `Что хочет заказать: ${displayTextValue(data.productType)}`,
  `Для кого: ${displayTextValue(data.recipient)}`,
  `Дата рождения: ${displayTextValue(data.birthDate)}`,
  `Фурнитура: ${displayTextValue(data.hardware)}`,
  `Размер: ${displayTextValue(data.size)}`,
  `Цвет: ${displayTextValue(data.colors)}`,
  `Пожелания: ${displayTextValue(data.wishes)}`,
].join("\n");

const sendToTelegram = async (data, env) => {
  if (!env.BOT_TOKEN || !env.CHAT_ID) {
    console.error("Telegram is not configured");
    return false;
  }

  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE_URL}/bot${env.BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.CHAT_ID,
          text: buildTelegramMessage(data),
          parse_mode: "HTML",
        }),
      },
    );
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      console.error("Telegram API rejected the request", response.status);
      return false;
    }

    return true;
  } catch {
    console.error("Telegram request failed");
    return false;
  }
};

const sendToMax = async (data, env) => {
  if (!env.MAX_BOT_TOKEN || !env.MAX_CHAT_ID) {
    console.error("MAX is not configured");
    return false;
  }

  try {
    const url = new URL(`${MAX_API_BASE_URL}/messages`);
    url.searchParams.set("chat_id", env.MAX_CHAT_ID);
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: env.MAX_BOT_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: buildMaxMessage(data), format: "markdown" }),
    });

    if (!response.ok) {
      console.error("MAX API rejected the request", response.status);
      return false;
    }

    return true;
  } catch {
    console.error("MAX request failed");
    return false;
  }
};

const handlePost = async (request, env) => {
  let data;

  try {
    data = await request.json();
  } catch {
    return errorResponse(request, "Тело запроса должно содержать корректный JSON.", 400);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return errorResponse(request, "Тело запроса должно быть JSON-объектом.", 400);
  }

  data.birthDate = normalizeBirthDate(data.birthDate);

  const hasMissingFields = REQUIRED_FIELDS.some((field) => !String(data[field] || "").trim());

  if (hasMissingFields) {
    return errorResponse(request, "Заполните все обязательные поля.", 400);
  }

  data.phone = normalizeRussianPhone(data.phone);

  if (!CONTACT_METHODS[data.contactMethod]
    || (data.contactMethod === "telegram" && !String(data.telegram || "").trim())
    || (data.contactMethod === "max" && !String(data.max || "").trim())) {
    return errorResponse(request, "Укажите способ связи и контакт для выбранного способа.", 400);
  }

  if (!RUSSIAN_PHONE_PATTERN.test(String(data.phone).trim())) {
    return errorResponse(request, "Проверьте формат номера телефона.", 400);
  }

  if (!isValidBirthDate(data.birthDate)) {
    return errorResponse(request, "Проверьте дату рождения.", 400);
  }

  const hasOversizedField = Object.entries(FIELD_LIMITS)
    .some(([field, limit]) => String(data[field] || "").trim().length > limit);

  if (hasOversizedField) {
    return errorResponse(request, "Одно из полей заполнено слишком длинным текстом.", 400);
  }

  const [telegramSent, maxSent] = await Promise.all([
    sendToTelegram(data, env),
    sendToMax(data, env),
  ]);

  if (telegramSent || maxSent) {
    return jsonResponse(request, { success: true });
  }

  return errorResponse(request, "Не удалось отправить заявку. Попробуйте ещё раз.", 502);
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return errorResponse(request, "Origin не разрешён.", 403);
    }

    if (request.method === "OPTIONS") {
      if (!origin) {
        return errorResponse(request, "Origin не разрешён.", 403);
      }

      return new Response(null, { status: 204, headers: getCorsHeaders(request) });
    }

    if (request.method !== "POST") {
      return errorResponse(request, "Метод не поддерживается.", 405);
    }

    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
      return errorResponse(request, "Content-Type должен быть application/json.", 415);
    }

    return handlePost(request, env);
  },
};
