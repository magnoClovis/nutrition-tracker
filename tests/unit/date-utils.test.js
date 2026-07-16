const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createDateUtils } = require("../../date-utils.js");

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
      createDiaryTicker() {
        return {
          getGreetingPeriod: noop,
          getGreetingEmoji: noop,
          formatTickerAmount: noop,
          buildNutrientTickerSlide: noop
        };
      }
    },
    DateUtils: {
      createDateUtils(dependencies) {
        injectedDependencies = dependencies;
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
    }
  },
  Intl,
  Date,
  console
};
vm.runInNewContext(appSource, context);
assert.equal(typeof injectedDependencies?.normalizeLanguage, "function");
assert.equal(typeof injectedDependencies?.pickLang, "function");
assert.equal(typeof injectedDependencies?.localeForLang, "function");

const {
  rnd,
  quickQtys,
  divisor,
  portionLabel,
  formatDateDMY,
  formatDateDM,
  formatHeaderDate,
  capitalizeFirst,
  addDays
} = createDateUtils(injectedDependencies);

test("rounds values to one decimal without changing existing edge behavior", () => {
  assert.equal(rnd(0), 0);
  assert.equal(rnd(1.26), 1.3);
  assert.equal(rnd(-1.26), -1.3);
  assert.equal(rnd(0.04), 0);
});

test("uses the existing divisors for units and fallback inputs", () => {
  assert.equal(divisor("un"), 1);
  assert.equal(divisor("g"), 100);
  assert.equal(divisor(0), 100);
  assert.equal(divisor(-1), 100);
});

test("returns the existing quick quantities for each unit family", () => {
  assert.deepEqual(quickQtys("ml"), [100, 150, 200, 250, 300, 500]);
  assert.deepEqual(quickQtys("un"), [1, 2, 3, 4]);
  assert.deepEqual(quickQtys("g"), [50, 100, 150, 200, 250, 300]);
  assert.deepEqual(quickQtys("kg"), [50, 100, 150, 200, 250, 300]);
});

test("localizes portion labels with the injected production helpers", () => {
  assert.equal(portionLabel("un", "pt"), "por 1 unidade");
  assert.equal(portionLabel("un", "en"), "per unit");
  assert.equal(portionLabel("un", "es"), "por unidad");
  assert.equal(portionLabel("g", "pt"), "por 100g");
  assert.equal(portionLabel("ml", "en"), "per 100ml");
  assert.equal(portionLabel("ml", "es"), "por 100ml");
});

test("formats stored dates across month, year, and leap-day boundaries", () => {
  assert.equal(formatDateDMY("2024-02-29"), "29-02-2024");
  assert.equal(formatDateDMY("2023-12-31"), "31-12-2023");
  assert.equal(formatDateDM("2024-01-01"), "01-01");
  assert.equal(formatDateDM("2024-02-29"), "29-02");
  assert.equal(formatDateDMY(""), "—");
  assert.equal(formatDateDM(null), "—");
});

test("formats header dates in Portuguese, English, and Spanish", () => {
  assert.equal(formatHeaderDate("2024-02-29", "pt"), "Quinta-feira, 29 de fevereiro");
  assert.equal(formatHeaderDate("2023-12-31", "en"), "Sunday, December 31");
  assert.equal(formatHeaderDate("2024-01-01", "es"), "Lunes, 1 de enero");
});

test("adds days across month, year, and leap-day boundaries", () => {
  assert.equal(addDays("2024-01-31", 1), "2024-02-01");
  assert.equal(addDays("2023-12-31", 1), "2024-01-01");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2024-03-01", -1), "2024-02-29");
});

test("capitalizes empty, accented, and special-character strings consistently", () => {
  assert.equal(capitalizeFirst(""), "");
  assert.equal(capitalizeFirst("árvore"), "Árvore");
  assert.equal(capitalizeFirst("ñandú"), "Ñandú");
  assert.equal(capitalizeFirst("✨ brilho"), "✨ brilho");
});
