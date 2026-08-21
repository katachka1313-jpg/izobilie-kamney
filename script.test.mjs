import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = `${await readFile(new URL("./script.js", import.meta.url), "utf8")}
globalThis.testHelpers = { formatBirthDate, isValidBirthDate };`;
const context = vm.createContext({
  console,
  Date,
  HTMLAnchorElement: class {},
  HTMLButtonElement: class {},
  HTMLFormElement: class {},
  HTMLInputElement: class {},
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
