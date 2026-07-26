const test = require("node:test");
const assert = require("node:assert/strict");
const { createI18n } = require("../../i18n.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../date-utils.js"))],
  ["ESM", () => import("../../src/composite/date-utils.js")]
];

const { normalizeLanguage, pickLang, localeForLang } = createI18n();

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createDateUtils } = await load();
      return callback(createDateUtils({ normalizeLanguage, pickLang, localeForLang }));
    });
  });
}

contractTest("rounds values to one decimal without changing existing edge behavior", ({ rnd }) => {
  assert.equal(rnd(0), 0);
  assert.equal(rnd(1.26), 1.3);
  assert.equal(rnd(-1.26), -1.3);
  assert.equal(rnd(0.04), 0);
});

contractTest("uses the existing divisors for units and fallback inputs", ({ divisor }) => {
  assert.equal(divisor("un"), 1);
  assert.equal(divisor("g"), 100);
  assert.equal(divisor(0), 100);
  assert.equal(divisor(-1), 100);
});

contractTest("returns the existing quick quantities for each unit family", ({ quickQtys }) => {
  assert.deepEqual(quickQtys("ml"), [100, 150, 200, 250, 300, 500]);
  assert.deepEqual(quickQtys("un"), [1, 2, 3, 4]);
  assert.deepEqual(quickQtys("g"), [50, 100, 150, 200, 250, 300]);
  assert.deepEqual(quickQtys("kg"), [50, 100, 150, 200, 250, 300]);
});

contractTest("localizes portion labels with the injected production helpers", ({ portionLabel }) => {
  assert.equal(portionLabel("un", "pt"), "por 1 unidade");
  assert.equal(portionLabel("un", "en"), "per unit");
  assert.equal(portionLabel("un", "es"), "por unidad");
  assert.equal(portionLabel("g", "pt"), "por 100g");
  assert.equal(portionLabel("ml", "en"), "per 100ml");
  assert.equal(portionLabel("ml", "es"), "por 100ml");
});

contractTest("formats stored dates across month, year, and leap-day boundaries", ({ formatDateDMY, formatDateDM }) => {
  assert.equal(formatDateDMY("2024-02-29"), "29-02-2024");
  assert.equal(formatDateDMY("2023-12-31"), "31-12-2023");
  assert.equal(formatDateDM("2024-01-01"), "01-01");
  assert.equal(formatDateDM("2024-02-29"), "29-02");
  assert.equal(formatDateDMY(""), "—");
  assert.equal(formatDateDM(null), "—");
});

contractTest("formats header dates in Portuguese, English, and Spanish", ({ formatHeaderDate }) => {
  assert.equal(formatHeaderDate("2024-02-29", "pt"), "Quinta-feira, 29 de fevereiro");
  assert.equal(formatHeaderDate("2023-12-31", "en"), "Sunday, December 31");
  assert.equal(formatHeaderDate("2024-01-01", "es"), "Lunes, 1 de enero");
});

contractTest("adds days across month, year, and leap-day boundaries", ({ addDays }) => {
  assert.equal(addDays("2024-01-31", 1), "2024-02-01");
  assert.equal(addDays("2023-12-31", 1), "2024-01-01");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2024-03-01", -1), "2024-02-29");
});

contractTest("capitalizes empty, accented, and special-character strings consistently", ({ capitalizeFirst }) => {
  assert.equal(capitalizeFirst(""), "");
  assert.equal(capitalizeFirst("árvore"), "Árvore");
  assert.equal(capitalizeFirst("ñandú"), "Ñandú");
  assert.equal(capitalizeFirst("✨ brilho"), "✨ brilho");
});
