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

contractTest("rescales every known nutrient and estimated weight from quantity", ({ rescaleMealEstimateItem }) => {
  const original = {
    id: "rice",
    name: "Rice",
    quantity: 120,
    unit: "g",
    estimatedGrams: 120,
    protein: 3,
    kcal: 156,
    carbs: 34,
    fat: 0.4,
    fiber: 0.5,
    salt: 0,
    sugars: null,
    satfat: "0.12",
    confidence: "medium"
  };

  const scaled = rescaleMealEstimateItem(original, "quantity", "180");

  assert.deepEqual(scaled, {
    ...original,
    quantity: "180",
    estimatedGrams: 180,
    protein: 4.5,
    kcal: 234,
    carbs: 51,
    fat: 0.6,
    fiber: 0.75,
    salt: 0,
    sugars: null,
    satfat: 0.18
  });
  assert.equal(original.quantity, 120);
  assert.equal(original.kcal, 156);
});

contractTest("rescales nutrients from estimated weight without changing quantity", ({ rescaleMealEstimateItem }) => {
  const original = {
    quantity: 1,
    unit: "portion",
    estimatedGrams: 250,
    protein: 12,
    kcal: 310,
    carbs: null,
    fat: 10,
    fiber: "",
    salt: undefined,
    sugars: 0,
    satfat: 2.5
  };

  const scaled = rescaleMealEstimateItem(original, "estimatedGrams", 300);

  assert.equal(scaled.quantity, 1);
  assert.equal(scaled.estimatedGrams, 300);
  assert.equal(scaled.protein, 14.4);
  assert.equal(scaled.kcal, 372);
  assert.equal(scaled.fat, 12);
  assert.equal(scaled.satfat, 3);
  assert.equal(scaled.sugars, 0);
  assert.equal(scaled.carbs, null);
  assert.equal(scaled.fiber, "");
  assert.equal(scaled.salt, undefined);
});

contractTest("uses manually edited nutrients as the next proportional baseline", ({ rescaleMealEstimateItem }) => {
  const original = {
    quantity: 100,
    estimatedGrams: 100,
    protein: 20,
    kcal: 200,
    carbs: null,
    fat: null,
    fiber: null,
    salt: null,
    sugars: null,
    satfat: null
  };
  const manuallyEdited = { ...original, protein: "30" };
  const scaled = rescaleMealEstimateItem(manuallyEdited, "quantity", 50);

  assert.equal(scaled.protein, 15);
  assert.equal(scaled.kcal, 100);
  assert.equal(scaled.estimatedGrams, 50);
});

contractTest("keeps nutrition unchanged when a proportional reference is not usable", ({ rescaleMealEstimateItem }) => {
  const item = { quantity: 100, estimatedGrams: 100, protein: 20, kcal: 200 };

  assert.deepEqual(
    rescaleMealEstimateItem(item, "quantity", ""),
    { ...item, quantity: "" }
  );
  assert.deepEqual(
    rescaleMealEstimateItem({ ...item, estimatedGrams: 0 }, "estimatedGrams", 200),
    { ...item, estimatedGrams: 200 }
  );
});

contractTest("rounds scaled values deterministically without floating-point noise", ({ rescaleMealEstimateItem }) => {
  const item = {
    quantity: 3,
    estimatedGrams: 100,
    protein: 0.1,
    kcal: 47.999984,
    carbs: null,
    fat: null,
    fiber: null,
    salt: null,
    sugars: null,
    satfat: null
  };
  const scaled = rescaleMealEstimateItem(item, "quantity", 6);

  assert.equal(scaled.protein, 0.2);
  assert.equal(scaled.kcal, 96);
  assert.equal(scaled.estimatedGrams, 200);
});

contractTest("rejects invalid proportional transformation arguments", ({ rescaleMealEstimateItem }) => {
  assert.throws(
    () => rescaleMealEstimateItem(null, "quantity", 2),
    /must be an object/
  );
  assert.throws(
    () => rescaleMealEstimateItem({ quantity: 1 }, "unit", 2),
    /quantity or estimatedGrams/
  );
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
