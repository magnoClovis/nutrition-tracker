const test = require("node:test");
const assert = require("node:assert/strict");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../i18n.js"))],
  ["ESM", () => import("../../src/leaf/i18n.js")]
];

const EXPECTED_MEAL_KEYS = [
  "Café da manhã",
  "Pré-treino",
  "Pós-treino",
  "Almoço",
  "Café da tarde",
  "Jantar",
  "Ceia",
  "Outro"
];

const EXPECTED_MEAL_LABELS = {
  pt: ["Café da manhã", "Pré-treino", "Pós-treino", "Almoço", "Café da tarde", "Jantar", "Ceia", "Outro"],
  en: ["Breakfast", "Pre-workout", "Post-workout", "Lunch", "Afternoon snack", "Dinner", "Supper", "Other"],
  es: ["Desayuno", "Pre-entreno", "Post-entreno", "Almuerzo", "Merienda", "Cena", "Colación", "Otro"]
};

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createI18n } = await load();
      return callback(createI18n());
    });
  });
}

contractTest("keeps the persisted language allowlist and Portuguese fallback stable", ({
  LANGUAGE_OPTIONS,
  normalizeLanguage,
  getLanguageOption
}) => {
  assert.deepEqual(LANGUAGE_OPTIONS.map(option => option.code), ["pt", "en", "es"]);
  assert.equal(normalizeLanguage("pt"), "pt");
  assert.equal(normalizeLanguage("en"), "en");
  assert.equal(normalizeLanguage("es"), "es");
  assert.equal(normalizeLanguage("fr"), "pt");
  assert.equal(normalizeLanguage(""), "pt");
  assert.equal(normalizeLanguage(undefined), "pt");
  assert.equal(getLanguageOption("invalid").code, "pt");
});

contractTest("selects language variants with the existing Portuguese fallback", ({ pickLang }) => {
  assert.equal(pickLang("pt", "Olá", "Hello", "Hola"), "Olá");
  assert.equal(pickLang("en", "Olá", "Hello", "Hola"), "Hello");
  assert.equal(pickLang("es", "Olá", "Hello", "Hola"), "Hola");
  assert.equal(pickLang("fr", "Olá", "Hello", "Hola"), "Olá");
  assert.equal(pickLang(undefined, "Olá", "Hello", "Hola"), "Olá");
  assert.equal(pickLang("en", "Olá", undefined, "Hola"), "Olá");
  assert.equal(pickLang("es", "Olá", "Hello", undefined), "Olá");
});

contractTest("reads nested translations and falls back to Portuguese through the text getter", ({
  getLocalizedValue,
  createTextGetter
}) => {
  const dictionary = {
    pt: { nested: { title: "Título {name}" }, onlyPt: "Somente PT" },
    en: { nested: { title: "Title {name}" } },
    es: {}
  };
  assert.equal(getLocalizedValue(dictionary, "en", "nested.title"), "Title {name}");
  assert.equal(getLocalizedValue(dictionary, "es", "nested.title"), undefined);
  assert.equal(getLocalizedValue(dictionary, "en", "missing.path"), undefined);

  const englishText = createTextGetter("en", dictionary);
  const spanishText = createTextGetter("es", dictionary);
  assert.equal(englishText("nested.title", {name: "Ana"}), "Title Ana");
  assert.equal(spanishText("nested.title", {name: "Ana"}), "Título Ana");
  assert.equal(englishText("onlyPt"), "Somente PT");
  assert.equal(englishText("unknown.key"), "unknown.key");
});

contractTest("interpolates parameters without changing missing-token behavior", ({ formatLocalizedText }) => {
  assert.equal(
    formatLocalizedText("Olá, {name}. Meta: {amount}{unit}.", {name: "Bia", amount: 120, unit: "g"}),
    "Olá, Bia. Meta: 120g."
  );
  assert.equal(formatLocalizedText("Valor: {missing}.", {}), "Valor: .");
  assert.equal(formatLocalizedText(null, {name: "Bia"}), null);
  assert.deepEqual(formatLocalizedText(["não", "texto"]), ["não", "texto"]);
});

contractTest("freezes meal storage keys and every positional translation array", ({
  MEAL_KEYS,
  STRINGS,
  getMealLabelsForLanguage
}) => {
  assert.deepEqual(MEAL_KEYS, EXPECTED_MEAL_KEYS);
  assert.deepEqual(STRINGS.pt.meals, EXPECTED_MEAL_LABELS.pt);
  assert.deepEqual(STRINGS.en.meals, EXPECTED_MEAL_LABELS.en);
  assert.deepEqual(STRINGS.es.meals, EXPECTED_MEAL_LABELS.es);
  assert.deepEqual(getMealLabelsForLanguage("pt"), EXPECTED_MEAL_LABELS.pt);
  assert.deepEqual(getMealLabelsForLanguage("en"), EXPECTED_MEAL_LABELS.en);
  assert.deepEqual(getMealLabelsForLanguage("es"), EXPECTED_MEAL_LABELS.es);
  assert.deepEqual(getMealLabelsForLanguage("invalid"), EXPECTED_MEAL_LABELS.pt);
});

contractTest("keeps locale and tutorial tab normalization behavior stable", ({
  localeForLang,
  sortLocaleForLang,
  normalizeTabKey
}) => {
  assert.equal(localeForLang("pt"), "pt-BR");
  assert.equal(localeForLang("en"), "en-US");
  assert.equal(localeForLang("es"), "es-ES");
  assert.equal(localeForLang("invalid"), "pt-BR");
  assert.equal(sortLocaleForLang("pt"), "pt");
  assert.equal(sortLocaleForLang("en"), "en");
  assert.equal(sortLocaleForLang("es"), "es");
  assert.equal(normalizeTabKey("Diário"), "diario");
  assert.equal(normalizeTabKey("Diary"), "diario");
  assert.equal(normalizeTabKey("Métricas"), "metricas");
  assert.equal(normalizeTabKey("unknown"), "unknown");
});

contractTest("labels the five-gram goal as salt rather than sodium in every language", ({
  STRINGS
}) => {
  assert.equal(STRINGS.pt.salt, "Sal");
  assert.equal(STRINGS.pt.goalSalt, "Sal (g)");
  assert.equal(STRINGS.en.salt, "Salt");
  assert.equal(STRINGS.en.goalSalt, "Salt (g)");
  assert.equal(STRINGS.es.salt, "Sal");
  assert.equal(STRINGS.es.goalSalt, "Sal (g)");
});
