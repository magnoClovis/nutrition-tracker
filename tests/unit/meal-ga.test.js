const test = require("node:test");
const assert = require("node:assert/strict");
const MealScore = require("../../meal-score.js");
const { createI18n } = require("../../i18n.js");
const { createDateUtils } = require("../../date-utils.js");
const { createFoodEntry } = require("../../food-entry.js");
const { createMealGA } = require("../../meal-ga.js");

const { normalizeLanguage, pickLang, localeForLang } = createI18n();
const { divisor } = createDateUtils({ normalizeLanguage, pickLang, localeForLang });

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function createFixture({ seed = 42, initialLog = {}, updateActiveLog } = {}) {
  let nextId = 0;
  let activeLog = initialLog;
  let updateCount = 0;
  const timerDelays = [];
  const foodEntry = createFoodEntry({
    divisor,
    createEntryId: () => `ga-entry-${++nextId}`,
    getEntryTime: () => "18:45",
    getPantry: () => [],
    buildDayTotals: () => ({})
  });
  const api = createMealGA({
    mealScore: MealScore,
    buildEntry: foodEntry.buildEntry,
    updateActiveLog: updater => {
      updateCount++;
      if (updateActiveLog) {
        updateActiveLog(updater);
        return;
      }
      activeLog = updater(activeLog);
    },
    random: createSeededRandom(seed),
    setTimeout: (callback, delay) => {
      timerDelays.push(delay);
      callback();
    }
  });
  return {
    api,
    timerDelays,
    get activeLog() { return activeLog; },
    get updateCount() { return updateCount; }
  };
}

function food(overrides = {}) {
  return {
    id: "food-1",
    name: "Test food",
    unit: "g",
    protein100: 10,
    kcal100: 100,
    carbs100: 12,
    fat100: 3,
    ...overrides
  };
}

function searchInput(overrides = {}) {
  return {
    pantry: [food(), food({ id: "food-2", name: "Second food", protein100: 5, kcal100: 50 })],
    activeLog: {},
    goals: { protein: 40, kcal: 400 },
    useAll: true,
    selectedIds: {},
    limits: {},
    globalMax: 5,
    tolerance: 0,
    useProteinTolerance: false,
    proteinTolerance: 20,
    kcalMin: "",
    kcalMax: "",
    proteinMin: "",
    proteinMax: "",
    now: new Date(2026, 6, 18, 21, 0, 0, 0),
    onProgress() {},
    onResults() {},
    ...overrides
  };
}

test("calculates automatic limits with the real MealScore timing functions", () => {
  const { api } = createFixture();
  const limits = api.getAutomaticMealSuggestionLimits({
    activeLog: {
      "Caf\u00e9 da manh\u00e3": [
        { protein: 12, kcal: 300 },
        { protein: 8, kcal: 200 }
      ]
    },
    goals: { protein: 100, kcal: 2000 },
    tolerance: 0,
    now: new Date(2026, 6, 18, 12, 0, 0, 0)
  });

  assert.deepEqual(limits, {
    remainingProtein: 80,
    remainingKcal: 1500,
    hoursLeft: 12,
    timeShare: 0.25,
    proteinMax: 20,
    kcalMax: 375
  });
});

test("generates deterministic suggestions for different pantry selections and goals", async () => {
  const allFoods = createFixture({ seed: 7 });
  const allResult = await allFoods.api.runGA(searchInput());
  assert.equal(allResult.status, "success");
  assert.ok(allResult.solutions.length > 0);
  assert.ok(allResult.solutions.every(solution => solution.kcal <= 400 && solution.protein <= 40));

  const selectedFood = createFixture({ seed: 7 });
  const selectedResult = await selectedFood.api.runGA(searchInput({
    useAll: false,
    selectedIds: { "food-2": true },
    goals: { protein: 20, kcal: 200 }
  }));
  assert.equal(selectedResult.status, "success");
  assert.ok(selectedResult.solutions.length > 0);
  assert.ok(selectedResult.solutions.every(solution =>
    solution.items.every(item => item.food.id === "food-2")
  ));
  assert.notDeepEqual(selectedResult.solutions[0].genes, allResult.solutions[0].genes);
});

test("applies per-food and nutritional bounds to every returned suggestion", async () => {
  const fixture = createFixture({ seed: 19 });
  const result = await fixture.api.runGA(searchInput({
    limits: {
      "food-1": { min: 1, max: 1 },
      "food-2": { min: 0, max: 2 }
    },
    kcalMax: 200,
    proteinMax: 20
  }));

  assert.equal(result.status, "success");
  assert.ok(result.solutions.length > 0);
  result.solutions.forEach(solution => {
    assert.equal(solution.genes[0], 1);
    assert.ok(solution.genes[1] >= 0 && solution.genes[1] <= 2);
    assert.ok(solution.kcal <= 200);
    assert.ok(solution.protein <= 20);
  });
});

test("keeps proteinTolerance without algorithmic effect", async () => {
  const lowTolerance = createFixture({ seed: 123 });
  const highTolerance = createFixture({ seed: 123 });
  const lowResult = await lowTolerance.api.runGA(searchInput({ proteinTolerance: 5 }));
  const highResult = await highTolerance.api.runGA(searchInput({ proteinTolerance: 50 }));

  assert.deepEqual(highResult, lowResult);
});

test("reports progress through callbacks and preserves the zero-delay yield", async () => {
  const fixture = createFixture({ seed: 1 });
  const progress = [];
  const result = await fixture.api.runGA(searchInput({
    pantry: [food({ protein100: 100, kcal100: 1000 })],
    goals: { protein: 5, kcal: 50 },
    onProgress: value => progress.push(value)
  }));

  assert.equal(result.status, "no-solution");
  assert.ok(progress.length > 0);
  assert.ok(progress.every(value => value > 0 && value <= 99));
  assert.deepEqual(fixture.timerDelays, Array(progress.length).fill(0));
});

test("returns the existing empty-pantry outcome without progress or results", async () => {
  const fixture = createFixture();
  const progress = [];
  const results = [];
  const outcome = await fixture.api.runGA(searchInput({
    pantry: [],
    onProgress: value => progress.push(value),
    onResults: value => results.push(value)
  }));

  assert.deepEqual(outcome, { status: "empty-pantry", solutions: [] });
  assert.deepEqual(progress, []);
  assert.deepEqual(results, []);
});

test("preserves goal-property fallbacks and missing-object TypeErrors", async () => {
  const fixture = createFixture();
  const fallback = fixture.api.getAutomaticMealSuggestionLimits({
    activeLog: {},
    goals: { protein: "invalid", kcal: null },
    tolerance: 0,
    now: new Date(2026, 6, 18, 21, 0, 0, 0)
  });
  assert.equal(fallback.remainingProtein, 150);
  assert.equal(fallback.remainingKcal, 2000);

  assert.throws(() => fixture.api.getAutomaticMealSuggestionLimits({
    activeLog: {},
    goals: undefined,
    tolerance: 0
  }), TypeError);
  assert.throws(() => fixture.api.getAutomaticMealSuggestionLimits({
    activeLog: undefined,
    goals: {},
    tolerance: 0
  }), TypeError);
  await assert.rejects(fixture.api.runGA(searchInput({ pantry: undefined })), TypeError);
});

test("adds GA quantities through the real buildEntry nutrient transformation", () => {
  const fixture = createFixture({ initialLog: { Almo\u00e7o: [] } });
  const selectedMeal = fixture.api.addGAResultToDiary({
    result: {
      items: [
        { food: food({ id: "rice", name: "Rice", unit: "g", protein100: 3, kcal100: 130 }), gene: 2 },
        { food: food({ id: "egg", name: "Egg", unit: "un", protein100: 6, kcal100: 70 }), gene: 3 }
      ]
    },
    targetMeal: "Almo\u00e7o",
    meals: ["Caf\u00e9 da manh\u00e3", "Almo\u00e7o"]
  });

  assert.equal(selectedMeal, "Almo\u00e7o");
  assert.equal(fixture.updateCount, 2);
  assert.deepEqual(fixture.activeLog.Almo\u00e7o.map(entry => ({
    id: entry.id,
    qty: entry.qty,
    protein: entry.protein,
    kcal: entry.kcal,
    time: entry.time
  })), [
    { id: "ga-entry-1", qty: 200, protein: 6, kcal: 260, time: "18:45" },
    { id: "ga-entry-2", qty: 3, protein: 18, kcal: 210, time: "18:45" }
  ]);
});

test("preserves one updater call per item for historical host semantics", () => {
  const historicalSnapshot = { Almo\u00e7o: [] };
  const resolvedUpdates = [];
  const fixture = createFixture({
    updateActiveLog: updater => resolvedUpdates.push(updater(historicalSnapshot))
  });
  fixture.api.addGAResultToDiary({
    result: {
      items: [
        { food: food({ id: "first" }), gene: 1 },
        { food: food({ id: "second" }), gene: 1 }
      ]
    },
    targetMeal: "Almo\u00e7o",
    meals: ["Caf\u00e9 da manh\u00e3", "Almo\u00e7o"]
  });

  assert.equal(fixture.updateCount, 2);
  assert.equal(resolvedUpdates.length, 2);
  assert.deepEqual(resolvedUpdates.map(log => log.Almo\u00e7o.map(entry => entry.foodId)), [
    ["first"],
    ["second"]
  ]);
});
