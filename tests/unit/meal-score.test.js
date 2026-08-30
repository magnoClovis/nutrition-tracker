const test = require("node:test");
const assert = require("node:assert/strict");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../meal-score.js"))],
  ["ESM", () => import("../../src/leaf/meal-score.js")]
];

const goals = { protein: 150, kcal: 2000, carbs: 240, fat: 70, fiber: 30, salt: 5 };
const atEightPm = new Date("2026-07-13T20:00:00");

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => callback(await load()));
  });
}

contractTest("returns a deterministic score inside the 0-5 range", (MealScore) => {
  const input = {
    goals,
    now: atEightPm,
    consumedEntries: [{ protein: 80, kcal: 1200, carbs: 140, fat: 40, fiber: 12, salt: 2 }],
    candidateEntries: [{ protein: 35, kcal: 420, carbs: 48, fat: 14, fiber: 8, salt: 1 }]
  };
  const first = MealScore.calculateMealScore(input);
  const second = MealScore.calculateMealScore(input);
  assert.equal(first.score, second.score);
  assert.ok(first.score >= 0 && first.score <= 5);
  assert.equal(first.coverage, 1);
  assert.equal(first.algorithmVersion, "meal-score-v2");
  assert.equal(first.confidence, "high");
});

contractTest("excludes incomplete optional nutrients with exact provisional reasons", (MealScore) => {
  const result = MealScore.calculateMealScore({
    goals: { protein: 150, kcal: 2000, fiber: 30, salt: 5 },
    now: atEightPm,
    consumedEntries: [{ protein: 80, kcal: 1200, fiber: null, salt: null }],
    candidateEntries: [{ protein: 35, kcal: 420, fiber: null, salt: null }]
  });
  assert.equal(result.valid, true);
  assert.equal(result.availableWeight, 50);
  assert.equal(result.applicableWeight, 78);
  assert.equal(result.coverage, 50 / 78);
  assert.equal(result.provisional, true);
  assert.equal(result.confidence, "low");
  assert.deepEqual(result.missing.sort(), ["fiber", "salt"]);
  assert.deepEqual(result.provisionalReasons, [
    { nutrient: "fiber", scope: "candidate", missingItemCount: 1, totalItemCount: 1 },
    { nutrient: "fiber", scope: "consumed", missingItemCount: 1, totalItemCount: 1 },
    { nutrient: "salt", scope: "candidate", missingItemCount: 1, totalItemCount: 1 },
    { nutrient: "salt", scope: "consumed", missingItemCount: 1, totalItemCount: 1 }
  ]);
});

contractTest("never treats partial optional data as zero or a complete component", (MealScore) => {
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
  assert.equal(result.components.fiber.available, false);
  assert.equal(result.components.fiber.candidateKnownCount, 1);
  assert.equal(result.components.fiber.candidateItemCount, 2);
  assert.deepEqual(result.provisionalReasons.filter(reason => reason.nutrient === "fiber"), [
    { nutrient: "fiber", scope: "candidate", missingItemCount: 1, totalItemCount: 2 },
    { nutrient: "fiber", scope: "consumed", missingItemCount: 1, totalItemCount: 2 }
  ]);
});

contractTest("requires calories and protein", (MealScore) => {
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

contractTest("time quota is smaller when more time remains", (MealScore) => {
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
  assert.ok(Math.abs(early.components.kcal.quota - 143.7621984554113) < 1e-10);
  assert.equal(late.components.kcal.quota, 300);
  assert.ok(late.components.kcal.score > early.components.kcal.score);
});

contractTest("uses the meal civil clock independently of evaluation time and host timezone", (MealScore) => {
  assert.equal(MealScore.hoursUntilCivilMidnight("2026-07-10T12:30:00-03:00"), 11.5);
  assert.equal(MealScore.hoursUntilCivilMidnight("2026-07-10T12:30:00+09:00"), 11.5);
  const base = {
    goals,
    mealOccurredAt: "2026-07-10T12:30:00-03:00",
    consumedEntries: [{ protein: 50, kcal: 700, carbs: 80, fat: 25, fiber: 8, salt: 1 }],
    candidateEntries: [{ protein: 35, kcal: 450, carbs: 55, fat: 15, fiber: 7, salt: 1 }]
  };
  const immediate = MealScore.calculateMealScore({...base, evaluatedAt: "2026-07-10T12:35:00-03:00"});
  const later = MealScore.calculateMealScore({...base, evaluatedAt: "2026-08-10T22:00:00+02:00"});
  assert.equal(immediate.score, later.score);
  assert.equal(immediate.timeShare, later.timeShare);
  assert.notEqual(immediate.evaluatedAt, later.evaluatedAt);
});

contractTest("uses smooth target and limit curves with monotonic excess penalties", (MealScore) => {
  assert.equal(MealScore.targetScore(100, 100, 0.75, 3), 1);
  assert.ok(MealScore.targetScore(80, 100, 0.75, 3) < 1);
  assert.ok(MealScore.targetScore(120, 100, 0.75, 3) < 1);
  assert.equal(MealScore.limitScore(80, 100, 5), 1);
  assert.ok(MealScore.limitScore(140, 100, 5) < MealScore.limitScore(120, 100, 5));
});

contractTest("budget decay matches configured anchor behavior", (MealScore) => {
  const score = MealScore.budgetScore(120, 100, 2, "full");
  assert.ok(Math.abs(score - Math.exp(-0.4)) < 1e-12);
});
