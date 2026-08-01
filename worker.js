const TELEGRAM_API_BASE_URL = "https://api.telegram.org";

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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

const handlePost = async (request, env) => {
  if (!env.BOT_TOKEN || !env.CHAT_ID) {
    console.error("BOT_TOKEN or CHAT_ID is not configured");
    return errorResponse("Сервис отправки временно недоступен.", 500);
  }

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

  try {
    const telegramResponse = await fetch(
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
    const telegramResult = await telegramResponse.json().catch(() => ({}));

    if (!telegramResponse.ok || !telegramResult.ok) {
      console.error(
        "Telegram API rejected the request",
        telegramResponse.status,
        telegramResult.description,
      );
      return errorResponse("Не удалось отправить заявку. Попробуйте ещё раз.", 502);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Telegram request failed", error);
    return errorResponse(
      "Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.",
      502,
    );
  }
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
