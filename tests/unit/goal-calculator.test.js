const test = require("node:test");
const assert = require("node:assert/strict");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../goal-calculator.js"))],
  ["ESM", () => import("../../src/leaf/goal-calculator.js")]
];

const baseProfile = {
  height: 180,
  birthDate: "1990-06-15",
  gender: "male",
  referenceDate: "2025-06-15",
  prefs: { goalType: "maintenance" }
};

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createGoalCalculator } = await load();
      return callback(createGoalCalculator());
    });
  });
}

contractTest("computes training goals with every activity factor", ({ ACTIVITY_LEVELS, computeGoals }) => {
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

contractTest("applies every rest factor instead of the training factor", ({ REST_FACTORS, computeGoals }) => {
  for (const [activityLevel, restFactor] of Object.entries(REST_FACTORS)) {
    const goals = computeGoals(80, false, {
      ...baseProfile,
      prefs: { ...baseProfile.prefs, activityLevel }
    });
    assert.equal(goals.fa, restFactor);
    assert.equal(goals.baseCalories, Math.round(goals.bmr * restFactor));
  }
});

contractTest("calculates age around the birthday using local calendar fields", ({ calculateAge }) => {
  assert.equal(calculateAge("1990-07-16", new Date(2026, 6, 16, 12)), 36);
  assert.equal(calculateAge("1990-07-15", new Date(2026, 6, 16, 12)), 36);
  assert.equal(calculateAge("1990-07-17", new Date(2026, 6, 16, 12)), 35);
});

contractTest("preserves leap-day birthday behavior", ({ calculateAge }) => {
  assert.equal(calculateAge("2000-02-29", new Date(2023, 1, 28, 12)), 22);
  assert.equal(calculateAge("2000-02-29", new Date(2023, 2, 1, 12)), 23);
  assert.equal(calculateAge("2000-02-29", new Date(2024, 1, 29, 12)), 24);
});

contractTest("uses maintenance, calculated loss and gain, and manual adjustments", ({ getGoalAdjustment }) => {
  assert.equal(getGoalAdjustment({ goalType: "maintenance" }), 0);
  assert.equal(getGoalAdjustment({ goalType: "loss", goalKg: 7.7, goalWeeks: 11 }), -770);
  assert.equal(getGoalAdjustment({ goalType: "gain", goalKg: 7.7, goalWeeks: 11 }), 770);
  assert.equal(getGoalAdjustment({ goalType: "loss", manualAdjustment: "-349.6" }), -350);
  assert.equal(getGoalAdjustment({ goalType: "gain", goalKg: 0, goalWeeks: 10 }), 0);
});

contractTest("uses goal-specific and manual protein multipliers", ({ defaultProteinMultiplier, getProteinMultiplier }) => {
  assert.equal(defaultProteinMultiplier("maintenance"), 1.6);
  assert.equal(defaultProteinMultiplier("loss"), 2);
  assert.equal(defaultProteinMultiplier("gain"), 2.2);
  assert.equal(getProteinMultiplier({ goalType: "loss" }), 2);
  assert.equal(getProteinMultiplier({ goalType: "gain", proteinMultiplier: "2.45" }), 2.45);
  assert.equal(getProteinMultiplier({ goalType: "gain", proteinMultiplier: 0 }), 2.2);
});

contractTest("keeps goal adjustments and protein defaults consistent on training and rest days", ({ computeGoals }) => {
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

contractTest("applies goal adjustment and protein multiplier inside computeGoals", ({ computeGoals }) => {
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
