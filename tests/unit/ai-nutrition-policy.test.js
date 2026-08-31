const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const matrix = require("../fixtures/ai-nutrition-policy.json");

const ROOT = path.resolve(__dirname, "../..");
const POLICY_PATH = path.join(ROOT, "AI_NUTRITION_POLICY.md");
const EXPECTED_SURFACES = [
  "meal-evaluation-explanation",
  "dish-description",
  "image-meal",
  "food-autofill",
  "nutrition-feedback",
  "eating-patterns",
  "pantry-suggestions"
];
const STRUCTURED_ENDPOINTS = {
  "dish-description": "/v1/ai/dish-estimate",
  "image-meal": "/v1/ai/image-meal",
  "food-autofill": "/v1/ai/food-estimate",
  "pantry-suggestions": "/v1/ai/pantry-suggestions"
};
const NARRATIVE_SURFACES = new Set([
  "meal-evaluation-explanation",
  "nutrition-feedback",
  "eating-patterns"
]);

test("C08-A is a reference-only contract for the approved model and score authority", () => {
  assert.equal(matrix.contractVersion, "c08-ai-nutrition-policy-v1");
  assert.equal(matrix.status, "reference-only");
  assert.equal(matrix.currentModel, "gemini-3.5-flash-lite");
  assert.equal(matrix.scoreAuthority, "meal-score-v2");
});

test("the matrix covers exactly the seven approved AI surfaces", () => {
  const ids = matrix.surfaces.map(surface => surface.id);
  assert.deepEqual(ids, EXPECTED_SURFACES);
  assert.equal(new Set(ids).size, EXPECTED_SURFACES.length);
  for (const surface of matrix.surfaces) {
    assert.match(surface.promptVersion, /^[a-z0-9-]+-v\d+$/);
    assert.ok(surface.outputContract);
    assert.ok(surface.specialRule);
  }
});

test("the hybrid boundary reserves schemas for structured results and the generic endpoint for narratives", () => {
  for (const surface of matrix.surfaces) {
    if (surface.kind === "structured") {
      assert.equal(surface.endpoint, STRUCTURED_ENDPOINTS[surface.id]);
      assert.notEqual(surface.outputContract, "bounded-nonempty-text");
    } else {
      assert.ok(NARRATIVE_SURFACES.has(surface.id));
      assert.equal(surface.kind, "narrative");
      assert.equal(surface.endpoint, "/v1/ai/completion");
      assert.equal(surface.outputContract, "bounded-nonempty-text");
    }
  }
  assert.equal(matrix.surfaces.find(surface => surface.id === "image-meal").endpointStatus, "existing");
  for (const id of ["dish-description", "food-autofill"]) {
    assert.equal(matrix.surfaces.find(surface => surface.id === id).endpointStatus, "deployed");
  }
  assert.equal(matrix.surfaces.find(surface => surface.id === "pantry-suggestions").endpointStatus, "ready-for-deploy");
});

test("nutrient semantics match meal-score-v2 and keep salt distinct from sodium", () => {
  const roles = Object.fromEntries(matrix.nutrients.map(item => [item.key, item.scoreRole]));
  assert.deepEqual(
    Object.keys(roles),
    ["kcal", "protein", "carbs", "fat", "fiber", "salt", "sugars", "satfat"]
  );
  assert.deepEqual(
    Object.entries(roles).filter(([, role]) => role === "required").map(([key]) => key),
    ["kcal", "protein"]
  );
  assert.deepEqual(
    Object.entries(roles).filter(([, role]) => role === "optional").map(([key]) => key),
    ["carbs", "fat", "fiber", "salt"]
  );
  assert.equal(matrix.nutrients.find(item => item.key === "salt").notEquivalentTo, "sodium");
  assert.ok(matrix.canonicalRules.includes("unknown-is-null-not-zero"));
});

test("feedback and patterns explicitly minimize raw profile data", () => {
  const forbidden = new Set(matrix.privacy.forbiddenRawProfileFields);
  assert.deepEqual(
    [...forbidden].sort(),
    ["age", "birthDate", "bmi", "gender", "height", "name", "sex", "weight"].sort()
  );
  assert.ok(matrix.privacy.allowedFeedbackContext.includes("calculatedGoals"));
  assert.ok(matrix.privacy.allowedFeedbackContext.includes("dataCoverage"));
  assert.ok(matrix.referenceCases.some(scenario => (
    scenario.id === "raw-profile-is-minimized"
      && scenario.appliesTo.includes("nutrition-feedback")
      && scenario.appliesTo.includes("eating-patterns")
      && scenario.expected.includes("omit-raw-profile-fields")
  )));
});

test("reference cases cover every surface and every canonical safety boundary", () => {
  const caseIds = matrix.referenceCases.map(scenario => scenario.id);
  assert.equal(new Set(caseIds).size, caseIds.length);
  const coveredSurfaces = new Set(matrix.referenceCases.flatMap(scenario => scenario.appliesTo));
  assert.deepEqual([...coveredSurfaces].sort(), [...EXPECTED_SURFACES].sort());

  const expectedOutcomes = new Set(matrix.referenceCases.flatMap(scenario => scenario.expected));
  for (const outcome of [
    "preserve-score",
    "never-zero-fill",
    "specific-coverage-limitation",
    "estimate-confidence-low-or-medium",
    "treat-as-data",
    "fail-closed-if-invalid",
    "recalculate-nutrients-locally",
    "never-label-as-sodium",
    "no-automatic-reprocessing"
  ]) assert.ok(expectedOutcomes.has(outcome), `missing reference outcome: ${outcome}`);
});

test("PT, EN, and ES retain equivalent contextual, provisional, salt, and disclaimer vocabulary", () => {
  assert.deepEqual(matrix.languages, ["pt", "en", "es"]);
  assert.deepEqual(Object.keys(matrix.localizedVocabulary), matrix.languages);
  for (const language of matrix.languages) {
    const copy = matrix.localizedVocabulary[language];
    assert.ok(copy.contextualAssessment);
    assert.ok(copy.provisional);
    assert.ok(copy.salt);
    assert.ok(copy.disclaimer);
    assert.doesNotMatch(copy.salt, /sodium|s[oó]dio/i);
  }
});

test("the human-readable policy stays synchronized with the executable contract", () => {
  const policy = fs.readFileSync(POLICY_PATH, "utf8");
  assert.match(policy, new RegExp(matrix.contractVersion));
  assert.match(policy, /implementada progressivamente até a C08-E/i);
  assert.match(policy, /gemini-3\.5-flash-lite/);
  assert.match(policy, /meal-score-v2/);
  for (const surface of matrix.surfaces) {
    assert.ok(policy.includes(`\`${surface.promptVersion}\``), `policy omits ${surface.promptVersion}`);
    assert.ok(policy.includes(surface.endpoint), `policy omits ${surface.endpoint}`);
  }
});
