const test = require("node:test");
const assert = require("node:assert/strict");
const matrix = require("../fixtures/meal-score-calibration.json");
const MealScore = require("../../meal-score.js");

const ALLOWED_SCOPES = new Set(["candidate", "consumed"]);

test("freezes the C20-A contract without changing the production algorithm", () => {
  assert.equal(matrix.contractVersion, "c20-calibration-v1");
  assert.equal(matrix.productionBaselineVersion, "meal-score-v1.1");
  assert.equal(MealScore.ALGORITHM_VERSION, matrix.productionBaselineVersion);
  assert.deepEqual(MealScore.DEFAULT_CONFIG.map(item => item.key), ["protein", "kcal", "fiber", "salt"]);
});

test("calibration cases have unique IDs, explicit occurrence times, and deterministic v1 baselines", () => {
  const ids = new Set();
  for (const scenario of matrix.cases) {
    assert.ok(scenario.id && !ids.has(scenario.id), `duplicate or empty case id: ${scenario.id}`);
    ids.add(scenario.id);
    assert.ok(Number.isFinite(Date.parse(scenario.mealOccurredAt)), `${scenario.id}: invalid mealOccurredAt`);
    assert.ok(Number.isFinite(Date.parse(scenario.evaluatedAt)), `${scenario.id}: invalid evaluatedAt`);
    assert.ok(Array.isArray(scenario.candidateEntries) && scenario.candidateEntries.length > 0);

    const input = {
      goals: scenario.goals,
      consumedEntries: scenario.consumedEntries,
      candidateEntries: scenario.candidateEntries,
      now: scenario.mealOccurredAt
    };
    const first = MealScore.calculateMealScore(input);
    const second = MealScore.calculateMealScore(input);
    assert.deepEqual(first, second, `${scenario.id}: v1 baseline must remain deterministic`);
    assert.equal(first.valid, scenario.expected.valid, `${scenario.id}: baseline validity mismatch`);
    if (first.valid) assert.ok(first.score >= 0 && first.score <= 5);
  }
});

test("every provisional expectation names the nutrient, scope, and exact missing counts", () => {
  const optional = new Set(matrix.optionalNutrients);
  const provisionalCases = matrix.cases.filter(scenario => scenario.expected.provisionalReasons.length > 0);
  assert.ok(provisionalCases.length >= 2, "matrix must cover candidate and consumed data gaps");

  const coveredScopes = new Set();
  const coveredNutrients = new Set();
  for (const scenario of provisionalCases) {
    for (const reason of scenario.expected.provisionalReasons) {
      assert.ok(optional.has(reason.nutrient), `${scenario.id}: unknown optional nutrient`);
      assert.ok(ALLOWED_SCOPES.has(reason.scope), `${scenario.id}: unknown reason scope`);
      assert.ok(Number.isInteger(reason.missingItemCount) && reason.missingItemCount > 0);
      assert.ok(Number.isInteger(reason.totalItemCount));
      assert.ok(reason.totalItemCount >= reason.missingItemCount);
      coveredScopes.add(reason.scope);
      coveredNutrients.add(reason.nutrient);
    }
  }
  assert.deepEqual([...coveredScopes].sort(), ["candidate", "consumed"]);
  assert.deepEqual([...coveredNutrients].sort(), [...optional].sort());
});

test("the matrix covers all approved nutrients and references valid relation cases", () => {
  assert.deepEqual(matrix.requiredNutrients, ["kcal", "protein"]);
  assert.deepEqual(matrix.optionalNutrients, ["carbs", "fat", "fiber", "salt"]);
  const ids = new Set(matrix.cases.map(scenario => scenario.id));
  const relationTypes = new Set(matrix.relations.map(relation => relation.type));
  assert.ok(relationTypes.has("score-greater-than"));
  assert.ok(relationTypes.has("score-equal"));

  for (const relation of matrix.relations) {
    const referenced = relation.type === "score-equal"
      ? [relation.left, relation.right]
      : [relation.higher, relation.lower];
    for (const id of referenced) assert.ok(ids.has(id), `relation references missing case: ${id}`);
  }
});

test("historical re-evaluation cases differ only by evaluatedAt", () => {
  const immediate = matrix.cases.find(scenario => scenario.id === "historical-evaluated-immediately");
  const later = matrix.cases.find(scenario => scenario.id === "historical-evaluated-later");
  const withoutEvaluationTime = scenario => {
    const clone = structuredClone(scenario);
    delete clone.id;
    delete clone.purpose;
    delete clone.evaluatedAt;
    return clone;
  };
  assert.deepEqual(withoutEvaluationTime(immediate), withoutEvaluationTime(later));
  assert.notEqual(immediate.evaluatedAt, later.evaluatedAt);
});
