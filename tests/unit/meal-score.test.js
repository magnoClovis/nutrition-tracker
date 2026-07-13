const test = require("node:test");
const assert = require("node:assert/strict");
const MealScore = require("../../meal-score.js");

const goals = { protein: 150, kcal: 2000, fiber: 30, salt: 5 };
const atEightPm = new Date("2026-07-13T20:00:00");

test("returns a deterministic score inside the 0-5 range", () => {
  const input = {
    goals,
    now: atEightPm,
    consumedEntries: [{ protein: 80, kcal: 1200, fiber: 12, salt: 2 }],
    candidateEntries: [{ protein: 35, kcal: 420, fiber: 8, salt: 1 }]
  };
  const first = MealScore.calculateMealScore(input);
  const second = MealScore.calculateMealScore(input);
  assert.equal(first.score, second.score);
  assert.ok(first.score >= 0 && first.score <= 5);
  assert.equal(first.coverage, 1);
});

test("excludes missing optional nutrients and renormalizes available weights", () => {
  const result = MealScore.calculateMealScore({
    goals,
    now: atEightPm,
    consumedEntries: [{ protein: 80, kcal: 1200, fiber: null, salt: null }],
    candidateEntries: [{ protein: 35, kcal: 420, fiber: null, salt: null }]
  });
  assert.equal(result.valid, true);
  assert.equal(result.availableWeight, 55);
  assert.equal(result.coverage, 55 / 85);
  assert.deepEqual(result.missing.sort(), ["fiber", "salt"]);
});

test("sums known optional values instead of discarding the whole nutrient", () => {
  const result = MealScore.calculateMealScore({
    goals,
    now: atEightPm,
    consumedEntries: [
      { protein: 50, kcal: 700, fiber: 8, salt: 1 },
      { protein: 30, kcal: 500, fiber: null, salt: null }
    ],
    candidateEntries: [
      { protein: 20, kcal: 250, fiber: 7, salt: 0.5 },
      { protein: 15, kcal: 170, fiber: null, salt: null }
    ]
  });
  assert.equal(result.valid, true);
  assert.equal(result.components.fiber.available, true);
  assert.equal(result.components.fiber.mealAmount, 7);
  assert.equal(result.components.fiber.consumedBefore, 8);
  assert.equal(result.components.fiber.candidateKnownCount, 1);
  assert.equal(result.components.fiber.candidateItemCount, 2);
  assert.equal(result.components.fiber.candidateComplete, false);
});

test("requires calories and protein", () => {
  const result = MealScore.calculateMealScore({
    goals,
    now: atEightPm,
    consumedEntries: [],
    candidateEntries: [{ protein: null, kcal: 300 }]
  });
  assert.equal(result.valid, false);
  assert.deepEqual(result.requiredMissing, ["protein"]);
  assert.equal(result.score, null);
});

test("time quota is smaller when more time remains", () => {
  const early = MealScore.calculateMealScore({
    goals,
    hoursLeft: 8,
    consumedEntries: [{ protein: 130, kcal: 1700, fiber: 25, salt: 4 }],
    candidateEntries: [{ protein: 20, kcal: 300, fiber: 5, salt: 0.5 }]
  });
  const late = MealScore.calculateMealScore({
    goals,
    hoursLeft: 1.5,
    consumedEntries: [{ protein: 130, kcal: 1700, fiber: 25, salt: 4 }],
    candidateEntries: [{ protein: 20, kcal: 300, fiber: 5, salt: 0.5 }]
  });
  assert.equal(early.components.kcal.quota, 112.5);
  assert.equal(late.components.kcal.quota, 300);
  assert.ok(late.components.kcal.score > early.components.kcal.score);
});

test("budget decay matches configured anchor behavior", () => {
  const score = MealScore.budgetScore(120, 100, 2, "full");
  assert.ok(Math.abs(score - Math.exp(-0.4)) < 1e-12);
});
