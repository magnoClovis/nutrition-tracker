const test = require("node:test");
const assert = require("node:assert/strict");
const { createI18n } = require("../../i18n.js");
const { createDiaryTicker } = require("../../diary-ticker.js");

const { localeForLang, pickLang } = createI18n();

const {
  getGreetingPeriod,
  getGreetingEmoji,
  formatTickerAmount,
  buildNutrientTickerSlide: build
} = createDiaryTicker({ localeForLang, pickLang });

test("formats ticker amounts with the injected production locales", () => {
  assert.equal(formatTickerAmount(6.5, "g", "pt"), "6,5g");
  assert.equal(formatTickerAmount(6.5, "g", "en"), "6.5g");
  assert.equal(formatTickerAmount(180, "kcal", "es"), "180 kcal");
});

test("ticker omits missing targets and zero consumption", () => {
  assert.equal(build({key: "protein", label: "Proteína", value: 0, target: 164, unit: "g", group: "gain", lang: "pt"}), null);
  assert.equal(build({key: "protein", label: "Proteína", value: 100, target: 0, unit: "g", group: "gain", lang: "pt"}), null);
});

test("gain nutrients stay neutral below target and green at or above it", () => {
  const below = build({key: "protein", label: "Proteína", value: 100, target: 164, unit: "g", group: "gain", lang: "pt"});
  const exact = build({key: "fiber", label: "Fibra", value: 30, target: 30, unit: "g", group: "gain", lang: "pt"});
  const above = build({key: "protein", label: "Proteína", value: 170, target: 164, unit: "g", group: "gain", lang: "pt"});
  assert.equal(below.tone, "neutral");
  assert.equal(exact.tone, "success");
  assert.equal(above.tone, "success");
  assert.match(above.text, /6g além do objetivo/);
});

test("limit nutrients turn green only at target and alert above it", () => {
  const exact = build({key: "kcal", label: "Calorias", value: 2692, target: 2692, unit: "kcal", group: "limit", lang: "pt"});
  const above = build({key: "kcal", label: "Calorias", value: 2872, target: 2692, unit: "kcal", group: "limit", lang: "pt"});
  assert.equal(exact.tone, "success");
  assert.equal(above.tone, "alert");
  assert.match(above.text, /180 kcal/);
});

test("uses the injected production language selection for English and Spanish", () => {
  const english = build({key: "protein", label: "Protein", value: 100, target: 164, unit: "g", group: "gain", lang: "en"});
  const spanish = build({key: "protein", label: "Proteína", value: 100, target: 164, unit: "g", group: "gain", lang: "es"});
  assert.match(english.text, /64g of protein left/);
  assert.match(spanish.text, /Faltan 64g de proteína/);
});

test("greeting period covers morning, afternoon, and night", () => {
  assert.equal(getGreetingPeriod(8), "morning");
  assert.equal(getGreetingPeriod(15), "afternoon");
  assert.equal(getGreetingPeriod(22), "night");
  assert.equal(getGreetingEmoji("morning"), "☀️");
  assert.equal(getGreetingEmoji("afternoon"), "🌤️");
  assert.equal(getGreetingEmoji("night"), "🌙");
});
