import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = (await readFile(new URL("./worker.js", import.meta.url), "utf8"))
  .replace("export default {", "globalThis.worker = {");
const context = vm.createContext({
  console,
  Date,
  fetch,
  Headers,
  Request,
  Response,
  URL,
});

vm.runInContext(source, context);

const endpoint = "https://izobilie-kamney-form.example/";
const allowedOrigins = [
  "https://izobiliekamney.ru",
  "https://www.izobiliekamney.ru",
];

for (const origin of allowedOrigins) {
  test(`OPTIONS allows ${origin}`, async () => {
    const response = await context.worker.fetch(new Request(endpoint, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    }), {});

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
    assert.equal(response.headers.get("Access-Control-Allow-Headers"), "Content-Type");
  });
}

test("OPTIONS rejects an unknown origin without an allow-origin header", async () => {
  const response = await context.worker.fetch(new Request(endpoint, {
    method: "OPTIONS",
    headers: { Origin: "https://attacker.example" },
  }), {});

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
});

test("POST normalizes a compact birth date before sending to Telegram", async (testContext) => {
  let telegramMessage = "";
  const fetchMock = testContext.mock.method(context, "fetch", async (url, options) => {
    assert.match(String(url), /^https:\/\/api\.telegram\.org/);
    telegramMessage = JSON.parse(options.body).text;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  const response = await context.worker.fetch(new Request(endpoint, {
    method: "POST",
    headers: {
      Origin: "https://izobiliekamney.ru",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Олеся",
      phone: "+7 (999) 123-45-67",
      contactMethod: "telegram",
      telegram: "@olesia",
      productType: "Браслет",
      hardware: "Позолота",
      size: "17 см",
      birthDate: "05011993",
    }),
  }), { BOT_TOKEN: "token", CHAT_ID: "chat" });

  assert.equal(response.status, 200);
  assert.match(telegramMessage, /Дата рождения:<\/b> 05\.01\.1993/);
  assert.match(telegramMessage, /href="tel:\+79991234567"/);
  assert.match(telegramMessage, /href="https:\/\/t\.me\/olesia"/);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("POST requires the conditional contact", async () => {
  const response = await context.worker.fetch(new Request(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Олеся", phone: "+7 (999) 123-45-67", contactMethod: "max",
      productType: "Браслет", hardware: "Позолота", size: "17 см",
    }),
  }), {});

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { success: false, error: "Укажите способ связи и контакт для выбранного способа." });
});

test("POST rejects an impossible birth date", async () => {
  const response = await context.worker.fetch(new Request(endpoint, {
    method: "POST",
    headers: {
      Origin: "https://www.izobiliekamney.ru",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Олеся",
      phone: "+7 (999) 123-45-67",
      contactMethod: "telegram",
      telegram: "@olesia",
      productType: "Браслет",
      hardware: "Позолота",
      size: "17 см",
      birthDate: "31.02.1993",
    }),
  }), {});

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { success: false, error: "Проверьте дату рождения." });
});
