const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appSource = fs.readFileSync(path.resolve(__dirname, "../../app.js"), "utf8");
const helperSource = appSource.slice(0, appSource.indexOf("// Translations"));
const context = {
  React: {useState() {}, useEffect() {}, useRef() {}},
  Recharts: {},
  window: {},
  Intl,
  Date,
  localStorage: {getItem() { return null; }, setItem() {}},
  globalThis: null
};
context.globalThis = context;
vm.runInNewContext(
  helperSource + "\nglobalThis.buildTickerSlide = buildNutrientTickerSlide; globalThis.greetingPeriod = getGreetingPeriod; globalThis.greetingEmoji = getGreetingEmoji;",
  context
);

const build = context.buildTickerSlide;

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

test("greeting period covers morning, afternoon, and night", () => {
  assert.equal(context.greetingPeriod(8), "morning");
  assert.equal(context.greetingPeriod(15), "afternoon");
  assert.equal(context.greetingPeriod(22), "night");
  assert.equal(context.greetingEmoji("morning"), "☀️");
  assert.equal(context.greetingEmoji("afternoon"), "🌤️");
  assert.equal(context.greetingEmoji("night"), "🌙");
});
