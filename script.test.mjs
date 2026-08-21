import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = `${await readFile(new URL("./script.js", import.meta.url), "utf8")}
globalThis.testHelpers = { formatBirthDate, isValidBirthDate, normalizeRussianPhone, submissionErrorMessage };`;
const context = vm.createContext({
  console,
  Date,
  HTMLAnchorElement: class {},
  HTMLButtonElement: class {},
  HTMLFormElement: class {},
  HTMLElement: class {},
  HTMLInputElement: class {},
  HTMLSelectElement: class {},
  document: {
    querySelector: () => null,
    querySelectorAll: () => [],
  },
  window: {
    addEventListener: () => {},
    location: { href: "https://izobiliekamney.ru/", hash: "" },
    matchMedia: () => ({ matches: true }),
  },
});

vm.runInContext(source, context);

test("birth date mask turns eight digits into DD.MM.YYYY", () => {
  assert.equal(context.testHelpers.formatBirthDate("05011993"), "05.01.1993");
  assert.equal(context.testHelpers.formatBirthDate("05.01.1993"), "05.01.1993");
});

test("birth date validation accepts empty or real dates and rejects impossible dates", () => {
  assert.equal(context.testHelpers.isValidBirthDate(""), true);
  assert.equal(context.testHelpers.isValidBirthDate("29.02.2024"), true);
  assert.equal(context.testHelpers.isValidBirthDate("31.02.1993"), false);
  assert.equal(context.testHelpers.isValidBirthDate("05011993"), false);
});

test("phone normalization accepts mobile input and returns compact +7 format", () => {
  assert.equal(context.testHelpers.normalizeRussianPhone("+7 (926) 109-95-52"), "+79261099552");
  assert.equal(context.testHelpers.normalizeRussianPhone("8 926 109 95 52"), "+79261099552");
  assert.equal(context.testHelpers.normalizeRussianPhone("9261099552"), "+79261099552");
  assert.equal(context.testHelpers.normalizeRussianPhone("+7 926"), "");
});

test("network errors are replaced with a safe localized message", () => {
  const message = vm.runInContext(
    'testHelpers.submissionErrorMessage(new TypeError("Failed to fetch"))',
    context,
  );
  assert.match(message, /Не удалось связаться с сервером/);
  assert.doesNotMatch(message, /Failed to fetch/);
});

test("script remains parseable by Safari versions without optional chaining", () => {
  assert.doesNotMatch(source, /\?\./);
});

test("HTML starts conditional contacts disabled and loads the new script version", async () => {
  const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
  assert.match(html, /name="telegram_contact"[^>]* disabled>/);
  assert.match(html, /name="max_contact"[^>]* disabled>/);
  assert.match(html, /<script src="script\.js\?v=9"><\/script>/);
});
