const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createDiaryTicker } = require("../../diary-ticker.js");

const appSource = fs.readFileSync(path.resolve(__dirname, "../../app.js"), "utf8");
let injectedDependencies = null;
const noop = () => null;
const context = {
  React: {
    useState: noop,
    useEffect: noop,
    useRef: noop,
    createElement: noop,
    Component: class Component {}
  },
  Recharts: {
    LineChart: noop,
    Line: noop,
    XAxis: noop,
    YAxis: noop,
    Tooltip: noop,
    ResponsiveContainer: noop,
    ReferenceLine: noop
  },
  ReactDOM: { createRoot: () => ({ render: noop }) },
  document: { getElementById: () => ({}) },
  window: {
    APP_VERSION_LABEL: "Diário Nutricional v0.8.1 Beta",
    DiaryTicker: {
      createDiaryTicker(dependencies) {
        injectedDependencies = dependencies;
        return {
          getGreetingPeriod: noop,
          getGreetingEmoji: noop,
          formatTickerAmount: noop,
          buildNutrientTickerSlide: noop
        };
      }
    },
    DateUtils: {
      createDateUtils() {
        return {
          rnd: noop,
          quickQtys: noop,
          divisor: noop,
          portionLabel: noop,
          formatDateDMY: noop,
          formatDateDM: noop,
          formatHeaderDate: noop,
          capitalizeFirst: noop,
          addDays: noop
        };
      }
    },
    GoalCalculator: {
      createGoalCalculator() {
        return {
          ACTIVITY_LEVELS: {},
          REST_FACTORS: {},
          calculateAge: noop,
          getGoalAdjustment: noop,
          defaultProteinMultiplier: noop,
          getProteinMultiplier: noop,
          computeGoals: noop
        };
      }
    }
  },
  Intl,
  Date,
  console
};
vm.runInNewContext(appSource, context);
assert.equal(typeof injectedDependencies?.localeForLang, "function");
assert.equal(typeof injectedDependencies?.pickLang, "function");

const {
  getGreetingPeriod,
  getGreetingEmoji,
  formatTickerAmount,
  buildNutrientTickerSlide: build
} = createDiaryTicker(injectedDependencies);

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
