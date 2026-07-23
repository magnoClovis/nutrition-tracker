const test = require("node:test");
const assert = require("node:assert/strict");
const { createI18n } = require("../../i18n.js");
const { createDateUtils } = require("../../date-utils.js");
const { createGoalCalculator } = require("../../goal-calculator.js");
const { createDailyNutritionModel } = require("../../daily-nutrition-model.js");

const { normalizeLanguage, pickLang, localeForLang } = createI18n();
const { rnd } = createDateUtils({ normalizeLanguage, pickLang, localeForLang });
const { getGoalAdjustment, getProteinMultiplier } = createGoalCalculator();
const model = createDailyNutritionModel({ rnd, getGoalAdjustment, getProteinMultiplier });

function baseGoals(overrides = {}) {
  return {
    protein: 140,
    kcal: 2200,
    carbs: 250,
    fat: 70,
    fiber: 30,
    salt: 5,
    baseCalories: 2500,
    adjustment: -300,
    proteinMultiplier: 1.8,
    ...overrides
  };
}

test("builds rounded storage totals and unrounded live totals with existing null handling", () => {
  const log = {
    Breakfast: [
      { protein: 10.125, kcal: 100.555, carbs: 20.2, fat: 3.333, fiber: null, salt: 0.125, sugars: 4.5, satfat: 1.2 },
      { protein: null, kcal: 49.445, carbs: 4.8, fat: 1.667, fiber: 2.25, salt: 0.125, sugars: 1.5, satfat: 0.8 }
    ]
  };

  assert.deepEqual(model.buildDayTotals(log), {
    protein: 10.1,
    kcal: 150,
    carbs: 25,
    fat: 5,
    fiber: 2.3,
    salt: 0.3
  });
  assert.deepEqual(model.buildActiveLogTotals(log, "kcal100"), {
    protein: 10.125,
    kcal: 150,
    carbs: 25,
    fat: 5,
    fiber: 2.25,
    salt: 0.25,
    sugars: 6,
    satfat: 2
  });
});

test("preserves water rounding, zero custom-goal fallback, and goal-calculator fallbacks", () => {
  const result = model.buildDailyGoalModel({
    baseGoals: baseGoals({ baseCalories: 0, adjustment: null, proteinMultiplier: 0 }),
    customGoals: { protein: 0, kcal: 1800, water: 0 },
    nutritionPrefs: { goalType: "loss", manualAdjustment: "-250", proteinMultiplier: "2" },
    viewWeight: 81,
    isTraining: true
  });

  assert.equal(result.baseWaterGoal, 3250);
  assert.equal(result.calculatedGoals.protein, 140);
  assert.equal(result.calculatedGoals.kcal, 1800);
  assert.equal(result.calculatedGoals.water, 3250);
  assert.equal(result.calorieAdjustment, -250);
  assert.equal(result.calorieBase, 2450);
  assert.equal(result.proteinMultiplier, 2);

  const noWeight = model.buildDailyGoalModel({
    baseGoals: baseGoals(),
    customGoals: {},
    nutritionPrefs: {},
    viewWeight: 0,
    isTraining: false
  });
  assert.equal(noWeight.baseWaterGoal, 2500);
});

test("returns warning levels and ordered health guardrails at existing boundaries", () => {
  const extreme = model.buildDailyGoalModel({
    baseGoals: baseGoals({ kcal: 1100, baseCalories: 2000, adjustment: -800 }),
    customGoals: {},
    nutritionPrefs: { goalType: "loss", goalKg: "10", goalWeeks: "5" },
    viewWeight: 80,
    isTraining: false
  });
  assert.equal(extreme.adjustmentWarningLevel, "extreme");
  assert.deepEqual(extreme.healthGuardrailCodes, [
    "low-calories",
    "large-adjustment",
    "large-adjustment-percent",
    "fast-loss"
  ]);

  const high = model.buildDailyGoalModel({
    baseGoals: baseGoals({ kcal: 2250, baseCalories: 3000, adjustment: -750 }),
    customGoals: {},
    nutritionPrefs: { goalType: "gain", goalKg: "3", goalWeeks: "6" },
    viewWeight: 80,
    isTraining: true
  });
  assert.equal(high.adjustmentPct, 25);
  assert.equal(high.adjustmentWarningLevel, "extreme");
  assert.deepEqual(high.healthGuardrailCodes, ["large-adjustment"]);

  const fastGain = model.buildDailyGoalModel({
    baseGoals: baseGoals({ adjustment: 200 }),
    customGoals: {},
    nutritionPrefs: { goalType: "gain", goalKg: "4", goalWeeks: "4" },
    viewWeight: 80,
    isTraining: true
  });
  assert.deepEqual(fastGain.healthGuardrailCodes, ["fast-gain"]);
});

test("classifies every diary-status branch with the original strict thresholds", () => {
  assert.equal(model.classifyDiaryStatus({ entryCount: 0, proteinPercent: 100, kcalPercent: 100 }), "empty");
  assert.equal(model.classifyDiaryStatus({ entryCount: 1, proteinPercent: 100, kcalPercent: 116 }), "calories-high");
  assert.equal(model.classifyDiaryStatus({ entryCount: 1, proteinPercent: 59, kcalPercent: 61 }), "protein-lagging");
  assert.equal(model.classifyDiaryStatus({ entryCount: 1, proteinPercent: 100, kcalPercent: 115 }), "on-target");
  assert.equal(model.classifyDiaryStatus({ entryCount: 1, proteinPercent: 60, kcalPercent: 60 }), "in-progress");
});

test("selects reached goal metrics in the existing order and adds water only for today", () => {
  const snapshot = {
    tot: { protein: 100, kcal: 1999, carbs: 250, fat: 69, fiber: 30, salt: 5 },
    goals: { protein: 100, kcal: 2000, carbs: 250, fat: 70, fiber: 30, salt: 0, water: 2500 },
    totalWater: 2500
  };
  assert.deepEqual(
    model.getReachedGoalMetrics({ ...snapshot, isToday: false }).map(metric => [metric.key, metric.tone]),
    [["protein", "success"], ["carbs", "success"], ["fiber", "success"]]
  );
  assert.deepEqual(
    model.getReachedGoalMetrics({ ...snapshot, isToday: true }).map(metric => metric.key),
    ["protein", "carbs", "fiber", "water"]
  );
});

test("publishes the UMD factory and validates all direct dependencies", () => {
  assert.equal(typeof createDailyNutritionModel, "function");
  assert.throws(
    () => createDailyNutritionModel({ rnd, getGoalAdjustment: null, getProteinMultiplier }),
    /requires rnd, getGoalAdjustment, and getProteinMultiplier/
  );
});
