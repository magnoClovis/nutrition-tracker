const test = require("node:test");
const assert = require("node:assert/strict");

const implementations = [
  ["UMD", () => Promise.resolve(require("../../meal-estimate.js"))],
  ["ESM", () => import("../../src/composite/meal-estimate.js")]
];

function fixture(createMealEstimate) {
  let nextId = 0;
  return createMealEstimate({ createItemId: () => `estimate-item-${++nextId}` });
}

function validEstimate(overrides = {}) {
  return {
    status: "identified",
    dishName: "Chicken with rice",
    overallConfidence: "high",
    assumptions: ["150 g chicken", "120 g cooked rice"],
    items: [{
      name: "Chicken",
      quantity: 150,
      unit: "g",
      estimatedGrams: 150,
      protein: 42,
      kcal: 250,
      carbs: 0,
      fat: 8,
      fiber: 0,
      salt: 0.8,
      sugars: null,
      satfat: 2,
      confidence: "high"
    }, {
      id: "provided-id",
      name: "Rice",
      quantity: 120,
      unit: "g",
      estimatedGrams: 120,
      protein: 3,
      kcal: 156,
      carbs: 34,
      fat: 0.4,
      fiber: 0.5,
      salt: null,
      sugars: null,
      satfat: null,
      confidence: "medium"
    }],
    ...overrides
  };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const module = await load();
      return callback({ ...module, api: fixture(module.createMealEstimate) });
    });
  });
}

contractTest("normalizes provider data into the shared editable contract", ({ api }) => {
  const normalized = api.normalizeMealEstimate(validEstimate({
    dishName: "  Chicken with rice  ",
    overallConfidence: "alta",
    assumptions: ["  150 g chicken  ", "", "120 g cooked rice"],
    items: validEstimate().items.map((item, index) => ({
      ...item,
      confidence: index === 0 ? "alta" : "m\u00e9dia"
    }))
  }));

  assert.equal(normalized.dishName, "Chicken with rice");
  assert.equal(normalized.overallConfidence, "high");
  assert.deepEqual(normalized.assumptions, ["150 g chicken", "120 g cooked rice"]);
  assert.equal(normalized.items[0].id, "estimate-item-1");
  assert.equal(normalized.items[0].confidence, "high");
  assert.equal(normalized.items[1].id, "provided-id");
  assert.equal(normalized.items[1].confidence, "medium");
});

contractTest("recalculates totals locally and preserves unknown optional nutrients", ({ api }) => {
  const normalized = api.normalizeMealEstimate(validEstimate());
  assert.deepEqual(api.calculateTotals(normalized), {
    protein: 45,
    kcal: 406,
    carbs: 34,
    fat: 8.4,
    fiber: 0.5,
    salt: 0.8,
    sugars: null,
    satfat: 2
  });
});

contractTest("creates a neutral user-added item without inventing nutrition", ({ api }) => {
  assert.deepEqual(api.createEmptyItem(), {
    id: "estimate-item-1",
    name: "",
    quantity: 1,
    unit: "portion",
    estimatedGrams: null,
    protein: null,
    kcal: null,
    carbs: null,
    fat: null,
    fiber: null,
    salt: null,
    sugars: null,
    satfat: null,
    confidence: "low"
  });
});

contractTest("accepts explicit non-actionable results without invented foods", ({ api }) => {
  assert.deepEqual(api.normalizeMealEstimate({
    status: "not-identifiable",
    dishName: "",
    overallConfidence: null,
    assumptions: [],
    items: []
  }), {
    status: "not-identifiable",
    dishName: "",
    overallConfidence: null,
    assumptions: [],
    items: []
  });
});

contractTest("rejects missing required nutrition, negative values, and duplicate IDs", ({ api, MealEstimateValidationError }) => {
  const broken = validEstimate({
    items: [{
      id: "duplicate",
      name: "First",
      quantity: 1,
      unit: "portion",
      protein: null,
      kcal: -1,
      confidence: "high"
    }, {
      id: "duplicate",
      name: "Second",
      quantity: 1,
      unit: "portion",
      protein: 1,
      kcal: 2,
      confidence: "low"
    }]
  });

  assert.throws(
    () => api.normalizeMealEstimate(broken),
    error => error instanceof MealEstimateValidationError &&
      error.errors.some(item => item.path === "items.0.protein") &&
      error.errors.some(item => item.path === "items.0.kcal") &&
      error.errors.some(item => item.path === "items.1.id")
  );
});

contractTest("rejects more than twelve detected items", ({ api, MAX_ITEMS, MealEstimateValidationError }) => {
  const item = validEstimate().items[0];
  assert.throws(
    () => api.normalizeMealEstimate(validEstimate({
      items: Array.from({ length: MAX_ITEMS + 1 }, (_, index) => ({
        ...item,
        id: `item-${index}`
      }))
    })),
    error => error instanceof MealEstimateValidationError &&
      error.errors.some(itemError => itemError.path === "items" && itemError.code === "too-many")
  );
});
