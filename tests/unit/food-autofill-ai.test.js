const test = require("node:test");
const assert = require("node:assert/strict");
const { createI18n } = require("../../i18n.js");

const implementations = [
  ["UMD", () => Promise.resolve(require("../../food-autofill-ai.js"))],
  ["ESM", () => import("../../src/composite/food-autofill-ai.js")]
];
const { normalizeLanguage } = createI18n();
const nutrientKeys = [
  "protein100", "kcal100", "carbs100", "sugars100",
  "fat100", "satfat100", "fiber100", "salt100"
];

function nutrients(overrides = {}) {
  return Object.fromEntries(nutrientKeys.map(key => [key, null]).concat(Object.entries(overrides)));
}

function estimated(overrides = {}) {
  return {
    status: "estimated",
    reason: null,
    confidence: "medium",
    unitWeightG: null,
    nutrients: nutrients({ protein100: 12, kcal100: 200 }),
    ...overrides
  };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => test(`${format}: ${name}`, async () => callback(await load())));
}

contractTest("calls the structured endpoint contract with normalized language", async module => {
  const calls = [];
  const api = module.createFoodAutofillAI({
    requestStructuredFoodEstimate: async input => { calls.push(input); return estimated(); },
    normalizeLanguage
  });
  const result = await api.requestFoodAutofill({ foodName: "  Tofu  ", unit: "g", lang: "pt-BR" });
  assert.deepEqual(calls, [{ foodName: "Tofu", unit: "g", language: "pt" }]);
  assert.equal(result.status, "success");
  assert.equal(result.mode, "standard");
  assert.equal(result.fields.carbs100, null);
});

contractTest("scales per-100g values for one unit while preserving unknowns", async module => {
  const api = module.createFoodAutofillAI({
    requestStructuredFoodEstimate: async () => estimated({
      unitWeightG: 37.5,
      nutrients: nutrients({ protein100: 12.34, kcal100: 250, sugars100: 3.333 })
    }),
    normalizeLanguage
  });
  const result = await api.requestFoodAutofill({ foodName: "Snack", unit: "un", lang: "en" });
  const mapped = api.applyFoodAutofillResult({
    protein100: "old", kcal100: "old", carbs100: "keep", sugars100: "old", unitWeightG: "37.5"
  }, result);
  assert.equal(mapped.protein100, "4.63");
  assert.equal(mapped.kcal100, "93.75");
  assert.equal(mapped.sugars100, "1.25");
  assert.equal(mapped.carbs100, "keep");
  assert.equal(mapped.unitWeightG, "");
});

contractTest("returns a localized provider rejection without applying fields", async module => {
  const api = module.createFoodAutofillAI({
    requestStructuredFoodEstimate: async () => ({
      status: "rejected", reason: "unit mismatch", confidence: null, unitWeightG: null,
      nutrients: nutrients()
    }),
    normalizeLanguage
  });
  assert.deepEqual(await api.requestFoodAutofill({ foodName: "Milk", unit: "un", lang: "en" }), {
    status: "rejected", reason: "unit mismatch"
  });
});

contractTest("fails closed for partial, extra, negative, or inconsistent structured responses", async module => {
  const invalid = [
    { ...estimated(), extra: true },
    { ...estimated(), nutrients: { protein100: 1 } },
    estimated({ nutrients: nutrients({ protein100: -1, kcal100: 100 }) }),
    estimated({ unitWeightG: 50 }),
    estimated({ nutrients: nutrients({ protein100: null, kcal100: 100 }) })
  ];
  for (const response of invalid) {
    const api = module.createFoodAutofillAI({ requestStructuredFoodEstimate: async () => response, normalizeLanguage });
    await assert.rejects(
      api.requestFoodAutofill({ foodName: "Food", unit: "g", lang: "es" }),
      error => error instanceof module.FoodEstimateValidationError && error.code === "invalid-response"
    );
  }
});

contractTest("does not call transport for an empty food name", async module => {
  let calls = 0;
  const api = module.createFoodAutofillAI({
    requestStructuredFoodEstimate: async () => { calls += 1; return estimated(); },
    normalizeLanguage
  });
  assert.deepEqual(await api.requestFoodAutofill({ foodName: "   ", unit: "g", lang: "pt" }), { status: "empty-name" });
  assert.equal(calls, 0);
});
