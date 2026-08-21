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

const getMaxChatEvent = (update) => {
  const eventType = update?.update_type;

  if (!eventType) {
    return null;
  }

  const recipient = update.message?.recipient;
  const isGroupMessage = eventType.startsWith("message_")
    && ["chat", "group"].includes(recipient?.chat_type);
  const isChatEvent = [
    "bot_added",
    "bot_removed",
    "user_added",
    "user_removed",
    "chat_title_changed",
  ].includes(eventType);

  if (!isGroupMessage && !isChatEvent) {
    return null;
  }

  const chatId = isGroupMessage ? recipient?.chat_id : update.chat_id;

  if (chatId === undefined || chatId === null) {
    return null;
  }

  const chatTitle = update.chat?.title
    || recipient?.title
    || recipient?.chat_title
    || update.title;
  const result = {
    chat_id: chatId,
    event_type: eventType,
  };

  if (typeof chatTitle === "string" && chatTitle.trim()) {
    result.chat_title = chatTitle.trim();
  }

  return result;
};

const handleMaxChatId = async (env) => {
  if (!env.MAX_BOT_TOKEN) {
    console.error("MAX_BOT_TOKEN is not configured");
    return errorResponse("Сервис определения chat_id временно недоступен.", 500);
  }

  try {
    const maxResponse = await fetch(`${MAX_API_BASE_URL}/updates`, {
      headers: { Authorization: env.MAX_BOT_TOKEN },
    });

    if (!maxResponse.ok) {
      console.error("MAX API rejected the updates request", maxResponse.status);
      return errorResponse("Не удалось получить события MAX. Попробуйте ещё раз.", 502);
    }

    const maxResult = await maxResponse.json().catch(() => null);

    if (!maxResult || !Array.isArray(maxResult.updates)) {
      console.error("MAX API returned an unexpected updates response");
      return errorResponse("MAX вернул некорректный ответ. Попробуйте ещё раз.", 502);
    }

    const chats = maxResult.updates
      .map(getMaxChatEvent)
      .filter(Boolean)
      .filter((event, index, events) => events.findIndex((candidate) => (
        String(candidate.chat_id) === String(event.chat_id)
        && candidate.event_type === event.event_type
      )) === index);

    if (chats.length === 0) {
      return jsonResponse({
        message: "События групповых чатов не найдены. Добавьте бота в группу и отправьте в группе тестовое сообщение, затем повторите запрос.",
      });
    }

    return jsonResponse({ chats });
  } catch {
    console.error("MAX updates request failed");
    return errorResponse("Не удалось получить события MAX. Попробуйте ещё раз.", 502);
  }
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // GET /max-chat-id is the temporary diagnostic route for discovering MAX chat IDs.
    // It must be handled before the form's POST-only method guard below.
    if (request.method === "GET" && url.pathname === "/max-chat-id") {
      return handleMaxChatId(env);
    }

    if (request.method !== "POST") {
      return errorResponse("Метод не поддерживается.", 405);
    }

    return handlePost(request, env);
  },
};
