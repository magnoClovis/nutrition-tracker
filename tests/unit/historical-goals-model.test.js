const test = require("node:test");
const assert = require("node:assert/strict");
const { createGoalCalculator } = require("../../goal-calculator.js");
const { createBodyMetricsModel } = require("../../body-metrics-model.js");
const { createHistoricalGoalsModel } = require("../../historical-goals-model.js");

const { computeGoals } = createGoalCalculator();
const { getWeightForDate } = createBodyMetricsModel({
  computeGoals,
  formatDateDM: date => date,
  createMeasurementId: () => "measurement-id"
});
const { resolveHistoricalGoals } = createHistoricalGoalsModel({
  computeGoals,
  getWeightForDate
});

function baseSnapshot(overrides = {}) {
  return {
    date: "2024-02-01",
    today: "2026-07-22",
    dayIsTraining: true,
    weightHistory: [
      { id: "old", date: "2024-01-01", weight: 78, height: 179 },
      { id: "future", date: "2024-03-01", weight: 77, height: 178 }
    ],
    currentWeight: 80,
    currentHeight: 180,
    profileData: { birthDate: "1990-06-15", gender: "male" },
    nutritionPrefs: {
      activityLevel: "moderate",
      goalType: "loss",
      goalKg: "5",
      goalWeeks: "10",
      manualAdjustment: "",
      proteinMultiplier: ""
    },
    customGoals: {},
    frozenGoal: null,
    ...overrides
  };
}

test("recalculates a historical date with current preferences when no snapshot exists", () => {
  const snapshot = baseSnapshot({ customGoals: { protein: 190 } });
  const result = resolveHistoricalGoals(snapshot);
  const expectedRaw = computeGoals(78, true, {
    height: 179,
    birthDate: snapshot.profileData.birthDate,
    gender: snapshot.profileData.gender,
    prefs: snapshot.nutritionPrefs
  });

  assert.deepEqual(result.weightEntry, snapshot.weightHistory[0]);
  assert.deepEqual(result.rawGoal, expectedRaw);
  assert.equal(result.computedGoal.protein, 190);
  assert.equal(result.computedGoal.kcal, expectedRaw.kcal);
  assert.deepEqual(result.effectiveGoal, result.computedGoal);
});

test("overlays a frozen past snapshot while retaining recalculated metadata", () => {
  const frozenGoal = {
    protein: 150,
    kcal: 2100,
    carbs: 230,
    fat: 65,
    fiber: 28,
    salt: 4,
    water: 2600
  };
  const result = resolveHistoricalGoals(baseSnapshot({ frozenGoal }));

  assert.equal(result.effectiveGoal.protein, 150);
  assert.equal(result.effectiveGoal.kcal, 2100);
  assert.equal(result.effectiveGoal.water, 2600);
  assert.equal(result.effectiveGoal.baseCalories, result.computedGoal.baseCalories);
  assert.equal(result.effectiveGoal.adjustment, result.computedGoal.adjustment);
});

test("TODAY ignores an existing frozen snapshot", () => {
  const result = resolveHistoricalGoals(baseSnapshot({
    date: "2026-07-22",
    frozenGoal: { protein: 1, kcal: 1, water: 1 }
  }));

  assert.strictEqual(result.effectiveGoal, result.computedGoal);
  assert.notEqual(result.effectiveGoal.protein, 1);
  assert.equal(result.effectiveGoal.water, undefined);
});

test("numeric zero custom goals do not override while string zero does", () => {
  const result = resolveHistoricalGoals(baseSnapshot({
    customGoals: {
      protein: 0,
      kcal: "0",
      carbs: 0,
      fat: 0,
      fiber: 0,
      salt: 0
    }
  }));

  assert.equal(result.computedGoal.protein, result.rawGoal.protein);
  assert.equal(result.computedGoal.kcal, "0");
  assert.equal(result.computedGoal.carbs, result.rawGoal.carbs);
  assert.equal(result.computedGoal.fat, result.rawGoal.fat);
  assert.equal(result.computedGoal.fiber, result.rawGoal.fiber);
  assert.equal(result.computedGoal.salt, result.rawGoal.salt);
});

test("historical calculations keep using current age instead of the requested date", () => {
  const snapshot = baseSnapshot({
    date: "2010-01-01",
    weightHistory: [{ id: "historical", date: "2009-12-31", weight: 80, height: 180 }],
    profileData: { birthDate: "2000-01-01", gender: "male" },
    nutritionPrefs: { activityLevel: "moderate", goalType: "maintenance" }
  });
  const result = resolveHistoricalGoals(snapshot);
  const currentAgeGoal = computeGoals(80, true, {
    height: 180,
    birthDate: "2000-01-01",
    gender: "male",
    prefs: snapshot.nutritionPrefs
  });
  const historicalAgeGoal = computeGoals(80, true, {
    height: 180,
    birthDate: "2000-01-01",
    gender: "male",
    prefs: snapshot.nutritionPrefs,
    referenceDate: "2010-01-01"
  });

  assert.equal(result.rawGoal.bmr, currentAgeGoal.bmr);
  assert.notEqual(result.rawGoal.bmr, historicalAgeGoal.bmr);
});

test("preserves the richer manually refreshed snapshot shape without normalization", () => {
  const initial = resolveHistoricalGoals(baseSnapshot());
  const manuallyRefreshed = {
    ...initial.computedGoal,
    baseCalories: 1234,
    adjustment: -321
  };
  const result = resolveHistoricalGoals(baseSnapshot({ frozenGoal: manuallyRefreshed }));

  assert.equal(result.effectiveGoal.baseCalories, 1234);
  assert.equal(result.effectiveGoal.adjustment, -321);
  assert.equal(result.effectiveGoal.water, undefined);
});

test("uses fallback weight and height and preserves the explicit day type", () => {
  const calls = [];
  const resolver = createHistoricalGoalsModel({
    getWeightForDate: () => null,
    computeGoals: (weight, training, profile) => {
      calls.push({ weight, training, profile });
      return { protein: 100, kcal: 2000, carbs: 200, fat: 60, fiber: 30, salt: 5 };
    }
  }).resolveHistoricalGoals;
  const snapshot = baseSnapshot({
    dayIsTraining: false,
    weightHistory: [],
    currentWeight: 75,
    currentHeight: 175
  });

  resolver(snapshot);
  assert.equal(calls[0].weight, 75);
  assert.equal(calls[0].training, false);
  assert.equal(calls[0].profile.height, 175);
  assert.equal(Object.hasOwn(calls[0].profile, "referenceDate"), false);
});

test("publishes the UMD factory and requires both injected dependencies", () => {
  assert.equal(typeof createHistoricalGoalsModel, "function");
  assert.throws(
    () => createHistoricalGoalsModel({ computeGoals, getWeightForDate: null }),
    /requires computeGoals and getWeightForDate/
  );
});
