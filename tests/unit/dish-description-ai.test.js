const test = require("node:test");
const assert = require("node:assert/strict");
const { createI18n } = require("../../i18n.js");
const MealEstimate = require("../../meal-estimate.js");

const implementations = [
  ["UMD", () => Promise.resolve(require("../../dish-description-ai.js"))],
  ["ESM", () => import("../../src/composite/dish-description-ai.js")]
];
const { normalizeLanguage } = createI18n();

function remoteEstimate(overrides = {}) {
  return {
    status: "identified",
    dishName: "Rice and beans",
    overallConfidence: "medium",
    assumptions: ["120 g rice"],
    items: [{
      name: "Rice", quantity: 120, unit: "g", estimatedGrams: 120,
      protein: 3, kcal: 156, carbs: 34, fat: 0.4, fiber: null,
      salt: null, sugars: null, satfat: null, confidence: "medium"
    }],
    ...overrides
  };
}

function fixture(module, responses = [remoteEstimate()]) {
  const calls = [];
  let nextEstimateId = 0;
  let nextEntryId = 0;
  const domain = MealEstimate.createMealEstimate({ createItemId: () => `estimate-${++nextEstimateId}` });
  const queue = [...responses];
  const api = module.createDishDescriptionAI({
    requestStructuredDishEstimate: async input => { calls.push(input); return queue.shift(); },
    normalizeLanguage,
    normalizeMealEstimate: domain.normalizeMealEstimate,
    createEntryId: () => `entry-${++nextEntryId}`
  });
  return { api, calls };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => test(`${format}: ${name}`, async () => callback(await load())));
}

contractTest("normalizes the structured dish into the shared editable MealEstimate", async module => {
  const { api, calls } = fixture(module);
  const result = await api.requestDishEstimate({ description: "  rice and beans  ", lang: "en" });
  assert.deepEqual(calls, [{ description: "rice and beans", language: "en" }]);
  assert.equal(result.status, "success");
  assert.equal(result.result.dishName, "Rice and beans");
  assert.equal(result.result.items[0].id, "estimate-1");
  assert.equal(result.result.items[0].fiber, null);
});

contractTest("builds one diary entry per reviewed item without provider-only metadata", async module => {
  const { api } = fixture(module, [remoteEstimate({
    items: [remoteEstimate().items[0], {
      ...remoteEstimate().items[0], name: "Beans", quantity: 90, protein: 8, kcal: 115
    }]
  })]);
  const result = await api.requestDishEstimate({ description: "rice and beans", lang: "pt" });
  const entries = api.buildDescribedEntries({ estimate: result.result, description: "  edited context  " });
  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0], {
    id: "entry-1", foodId: null, name: "Rice", qty: 120, unit: "g",
    _estimated: true, _estimateSource: "description", _description: "edited context",
    protein: 3, kcal: 156, carbs: 34, fat: 0.4, fiber: null,
    salt: null, sugars: null, satfat: null
  });
  assert.doesNotMatch(JSON.stringify(entries), /assumptions|confidence|estimatedGrams|dishName/);
});

contractTest("fails closed before UI state when the shared contract is malformed", async module => {
  const invalid = remoteEstimate({ items: [{ ...remoteEstimate().items[0], protein: null }] });
  const { api } = fixture(module, [invalid]);
  await assert.rejects(
    api.requestDishEstimate({ description: "dish", lang: "es" }),
    error => error instanceof MealEstimate.MealEstimateValidationError
  );
});

contractTest("returns neutral statuses for empty and non-identifiable descriptions", async module => {
  const { api, calls } = fixture(module, [remoteEstimate({
    status: "not-identifiable", dishName: "", overallConfidence: "low", assumptions: [], items: []
  })]);
  assert.deepEqual(await api.requestDishEstimate({ description: " ", lang: "pt" }), { status: "empty-description" });
  assert.deepEqual(await api.requestDishEstimate({ description: "something", lang: "pt" }), {
    status: "not-identifiable", reason: "not-identifiable"
  });
  assert.equal(calls.length, 1);
});

contractTest("returns no entries without a reviewed estimate", async module => {
  const { api } = fixture(module);
  assert.deepEqual(api.buildDescribedEntries({ estimate: null, description: "ignored" }), []);
});
