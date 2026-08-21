const assert = require("node:assert/strict");
const test = require("node:test");

const handler = require("./send-request");

const validRequest = {
  method: "POST",
  body: {
    name: "Олеся <Ч>",
    phone: "+7 (999) 123-45-67",
    contactMethod: "telegram",
    telegram: "@olesia",
    productType: "Браслет",
    recipient: "Для себя",
    birthDate: "01.02.1990",
    hardware: "Позолота",
    size: "17 см",
    colors: "Зелёный & белый",
    wishes: "Без подвески",
  },
};

const createResponse = () => ({
  statusCode: 200,
  headers: {},
  payload: undefined,
  setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.payload = payload; return this; },
});

test("buildTelegramMessage formats all form fields and escapes HTML", () => {
  const message = handler.buildTelegramMessage(validRequest.body);

  assert.match(message, /^💎 <b>Новая заявка<\/b>/);
  assert.match(message, /<b>Имя:<\/b> Олеся &lt;Ч&gt;/);
  assert.match(message, /<b>Цвет:<\/b> Зелёный &amp; белый/);
  assert.match(message, /<b>Дата рождения:<\/b> 01\.02\.1990/);
  assert.match(
    message,
    /<b>Телефон:<\/b> \+7 \(999\) 123-45-67 — <a href="tel:\+79991234567">📞 Позвонить<\/a>/,
  );
  assert.match(message, /<b>Удобный способ связи:<\/b> Telegram/);
  assert.match(message, /<b>Telegram:<\/b> <a href="https:\/\/t\.me\/olesia">@olesia<\/a>/);
  assert.doesNotMatch(message, /<b>MAX:<\/b>/);
});

test("buildTelegramMessage keeps a MAX name as text and links a full profile URL", () => {
  const nameOnly = handler.buildTelegramMessage({ ...validRequest.body, contactMethod: "max", telegram: "", max: "olesia" });
  const linked = handler.buildTelegramMessage({ ...validRequest.body, contactMethod: "max", telegram: "", max: "https://max.ru/olesia" });

  assert.match(nameOnly, /<b>MAX:<\/b> olesia/);
  assert.doesNotMatch(nameOnly, /href=.*olesia/);
  assert.match(linked, /<b>MAX:<\/b> <a href="https:\/\/max\.ru\/olesia">/);
});

test("handler rejects an incomplete request before calling Telegram", async () => {
  const response = createResponse();
  process.env.BOT_TOKEN = "test-token";
  process.env.CHAT_ID = "test-chat";

  await handler({ method: "POST", body: { name: "Олеся" } }, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.payload, { ok: false, error: "Заполните все обязательные поля." });
});

test("handler rejects an invalid phone number", async () => {
  const response = createResponse();
  process.env.BOT_TOKEN = "test-token";
  process.env.CHAT_ID = "test-chat";

  await handler({
    ...validRequest,
    body: { ...validRequest.body, phone: "+7 999 123 45 67" },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.payload, { ok: false, error: "Проверьте формат номера телефона." });
});

test("handler rejects fields that would make the Telegram request too large", async () => {
  const response = createResponse();
  process.env.BOT_TOKEN = "test-token";
  process.env.CHAT_ID = "test-chat";

  await handler({
    ...validRequest,
    body: { ...validRequest.body, wishes: "а".repeat(1001) },
  }, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.payload, { ok: false, error: "Одно из полей заполнено слишком длинным текстом." });
});

test("handler sends the message using environment variables", async (context) => {
  const response = createResponse();
  process.env.BOT_TOKEN = "secret-token";
  process.env.CHAT_ID = "-100123";
  const fetchMock = context.mock.method(global, "fetch", async (url, options) => {
    assert.equal(url, "https://api.telegram.org/botsecret-token/sendMessage");
    const body = JSON.parse(options.body);
    assert.equal(body.chat_id, "-100123");
    assert.equal(body.parse_mode, "HTML");
    return { ok: true, json: async () => ({ ok: true }) };
  });

  await handler(validRequest, response);

  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.payload, { ok: true });
});
