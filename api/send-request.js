const TELEGRAM_API_BASE_URL = "https://api.telegram.org";

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

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ ok: false, error: "Метод не поддерживается." });
  }

  const botToken = process.env.BOT_TOKEN;
  const chatId = process.env.CHAT_ID;

  if (!botToken || !chatId) {
    console.error("BOT_TOKEN or CHAT_ID is not configured");
    return response.status(500).json({ ok: false, error: "Сервис отправки временно недоступен." });
  }

  const data = request.body && typeof request.body === "object" ? request.body : {};
  const hasMissingFields = REQUIRED_FIELDS.some((field) => !String(data[field] || "").trim());

  if (hasMissingFields) {
    return response.status(400).json({ ok: false, error: "Заполните все обязательные поля." });
  }

  if (!RUSSIAN_PHONE_PATTERN.test(String(data.phone).trim())) {
    return response.status(400).json({ ok: false, error: "Проверьте формат номера телефона." });
  }

  const hasOversizedField = Object.entries(FIELD_LIMITS)
    .some(([field, limit]) => String(data[field] || "").trim().length > limit);

  if (hasOversizedField) {
    return response.status(400).json({ ok: false, error: "Одно из полей заполнено слишком длинным текстом." });
  }

  try {
    const telegramResponse = await fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildTelegramMessage(data),
        parse_mode: "HTML",
      }),
    });
    const telegramResult = await telegramResponse.json().catch(() => ({}));

    if (!telegramResponse.ok || !telegramResult.ok) {
      console.error("Telegram API rejected the request", telegramResponse.status, telegramResult.description);
      return response.status(502).json({ ok: false, error: "Не удалось отправить заявку. Попробуйте ещё раз." });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error("Telegram request failed", error);
    return response.status(502).json({ ok: false, error: "Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз." });
  }
};

module.exports.buildTelegramMessage = buildTelegramMessage;
