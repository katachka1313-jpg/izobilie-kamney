const TELEGRAM_API_BASE_URL = "https://api.telegram.org";
const MAX_API_BASE_URL = "https://platform-api.max.ru";

// Origin GitHub Pages. If the repository is moved to another account,
// replace this value with the new origin (without a trailing slash).
const ALLOWED_ORIGIN = "https://katachka1313-jpg.github.io";

const REQUIRED_FIELDS = ["name", "phone", "contact", "productType", "hardware", "size"];
const FIELD_LIMITS = {
  name: 100,
  phone: 30,
  contact: 100,
  productType: 100,
  recipient: 100,
  birthDate: 20,
  hardware: 100,
  size: 100,
  colors: 200,
  wishes: 1000,
};
const RUSSIAN_PHONE_PATTERN = /^\+7\(\d{3}\) \d{3}-\d{2}-\d{2}$/;

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

const jsonResponse = (payload, status = 200, additionalHeaders = {}) => new Response(
  JSON.stringify(payload),
  {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      ...corsHeaders,
      ...additionalHeaders,
    },
  },
);

const errorResponse = (error, status) => jsonResponse({ success: false, error }, status);

const escapeHtml = (value) => String(value || "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const displayValue = (value) => escapeHtml(String(value || "").trim() || "Не указано");
const displayTextValue = (value) => String(value || "").trim() || "Не указано";

const buildTelegramMessage = (data) => [
  "💎 <b>Новая заявка</b>",
  "",
  `<b>Имя:</b> ${displayValue(data.name)}`,
  `<b>Телефон:</b> ${displayValue(data.phone)}`,
  `<b>Дополнительный контакт:</b> ${displayValue(data.contact)}`,
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
  `Телефон: ${displayTextValue(data.phone)}`,
  `Дополнительный контакт: ${displayTextValue(data.contact)}`,
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
      body: JSON.stringify({ text: buildMaxMessage(data) }),
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
    return errorResponse("Тело запроса должно содержать корректный JSON.", 400);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return errorResponse("Тело запроса должно быть JSON-объектом.", 400);
  }

  const hasMissingFields = REQUIRED_FIELDS.some((field) => !String(data[field] || "").trim());

  if (hasMissingFields) {
    return errorResponse("Заполните все обязательные поля.", 400);
  }

  if (!RUSSIAN_PHONE_PATTERN.test(String(data.phone).trim())) {
    return errorResponse("Проверьте формат номера телефона.", 400);
  }

  const hasOversizedField = Object.entries(FIELD_LIMITS)
    .some(([field, limit]) => String(data[field] || "").trim().length > limit);

  if (hasOversizedField) {
    return errorResponse("Одно из полей заполнено слишком длинным текстом.", 400);
  }

  const [telegramSent, maxSent] = await Promise.all([
    sendToTelegram(data, env),
    sendToMax(data, env),
  ]);

  if (telegramSent || maxSent) {
    return jsonResponse({ success: true });
  }

  return errorResponse("Не удалось отправить заявку. Попробуйте ещё раз.", 502);
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return errorResponse("Метод не поддерживается.", 405);
    }

    return handlePost(request, env);
  },
};
