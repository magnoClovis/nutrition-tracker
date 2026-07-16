const test = require("node:test");
const assert = require("node:assert/strict");
const { createGoalCalculator } = require("../../goal-calculator.js");

const {
  ACTIVITY_LEVELS,
  REST_FACTORS,
  calculateAge,
  getGoalAdjustment,
  defaultProteinMultiplier,
  getProteinMultiplier,
  computeGoals
} = createGoalCalculator();

const baseProfile = {
  height: 180,
  birthDate: "1990-06-15",
  gender: "male",
  referenceDate: "2025-06-15",
  prefs: { goalType: "maintenance" }
};

test("computes training goals with every activity factor", () => {
  for (const [activityLevel, activity] of Object.entries(ACTIVITY_LEVELS)) {
    const goals = computeGoals(80, true, {
      ...baseProfile,
      prefs: { ...baseProfile.prefs, activityLevel }
    });
    assert.equal(goals.fa, activity.factor);
    assert.equal(goals.baseCalories, Math.round(goals.bmr * activity.factor));
    assert.equal(goals.kcal, goals.baseCalories);
  }
});

test("applies every rest factor instead of the training factor", () => {
  for (const [activityLevel, restFactor] of Object.entries(REST_FACTORS)) {
    const goals = computeGoals(80, false, {
      ...baseProfile,
      prefs: { ...baseProfile.prefs, activityLevel }
    });
    assert.equal(goals.fa, restFactor);
    assert.equal(goals.baseCalories, Math.round(goals.bmr * restFactor));
  }
});

test("calculates age around the birthday using local calendar fields", () => {
  assert.equal(calculateAge("1990-07-16", new Date(2026, 6, 16, 12)), 36);
  assert.equal(calculateAge("1990-07-15", new Date(2026, 6, 16, 12)), 36);
  assert.equal(calculateAge("1990-07-17", new Date(2026, 6, 16, 12)), 35);
});

test("preserves leap-day birthday behavior", () => {
  assert.equal(calculateAge("2000-02-29", new Date(2023, 1, 28, 12)), 22);
  assert.equal(calculateAge("2000-02-29", new Date(2023, 2, 1, 12)), 23);
  assert.equal(calculateAge("2000-02-29", new Date(2024, 1, 29, 12)), 24);
});

test("uses maintenance, calculated loss and gain, and manual adjustments", () => {
  assert.equal(getGoalAdjustment({ goalType: "maintenance" }), 0);
  assert.equal(getGoalAdjustment({ goalType: "loss", goalKg: 7.7, goalWeeks: 11 }), -770);
  assert.equal(getGoalAdjustment({ goalType: "gain", goalKg: 7.7, goalWeeks: 11 }), 770);
  assert.equal(getGoalAdjustment({ goalType: "loss", manualAdjustment: "-349.6" }), -350);
  assert.equal(getGoalAdjustment({ goalType: "gain", goalKg: 0, goalWeeks: 10 }), 0);
});

test("uses goal-specific and manual protein multipliers", () => {
  assert.equal(defaultProteinMultiplier("maintenance"), 1.6);
  assert.equal(defaultProteinMultiplier("loss"), 2);
  assert.equal(defaultProteinMultiplier("gain"), 2.2);
  assert.equal(getProteinMultiplier({ goalType: "loss" }), 2);
  assert.equal(getProteinMultiplier({ goalType: "gain", proteinMultiplier: "2.45" }), 2.45);
  assert.equal(getProteinMultiplier({ goalType: "gain", proteinMultiplier: 0 }), 2.2);
});

test("keeps goal adjustments and protein defaults consistent on training and rest days", () => {
  const cases = [
    { goalType: "maintenance", adjustment: 0, proteinMultiplier: 1.6 },
    { goalType: "loss", adjustment: -110, proteinMultiplier: 2 },
    { goalType: "gain", adjustment: 110, proteinMultiplier: 2.2 }
  ];
  for (const train of [true, false]) {
    for (const expected of cases) {
      const goals = computeGoals(80, train, {
        ...baseProfile,
        prefs: {
          activityLevel: "moderate",
          goalType: expected.goalType,
          goalKg: 1,
          goalWeeks: 10
        }
      });
      assert.equal(goals.adjustment, expected.adjustment);
      assert.equal(goals.proteinMultiplier, expected.proteinMultiplier);
      assert.equal(goals.protein, Math.round(80 * expected.proteinMultiplier));
    }
  }
});

test("applies goal adjustment and protein multiplier inside computeGoals", () => {
  const goals = computeGoals(80, true, {
    ...baseProfile,
    prefs: {
      activityLevel: "moderate",
      goalType: "loss",
      goalKg: 7.7,
      goalWeeks: 11
    }
  });
  assert.equal(goals.adjustment, -770);
  assert.equal(goals.proteinMultiplier, 2);
  assert.equal(goals.protein, 160);
  assert.equal(goals.kcal, Math.max(1200, goals.baseCalories - 770));
});
