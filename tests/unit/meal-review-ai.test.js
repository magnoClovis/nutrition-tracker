const test = require("node:test");
const assert = require("node:assert/strict");
const { createI18n } = require("../../i18n.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../meal-review-ai.js"))],
  ["ESM", () => import("../../src/composite/meal-review-ai.js")]
];

const { pickLang } = createI18n();

function getEvaluationCount(result) {
  const components = Object.values(result?.components || {});
  return {
    evaluated: components.filter(component => component.available).length,
    total: components.length
  };
}

function review(overrides = {}) {
  return {
    meal: "Almoço",
    source: "staged",
    items: [
      { name: "Chicken", qty: 150, unit: "g", protein: 40 },
      { name: "Rice", qty: 90, unit: "g", kcal: 120 }
    ],
    result: {
      algorithmVersion: "meal-score-v2",
      score: 4.567,
      coverage: 0.876,
      hoursLeft: 2.345,
      components: {
        protein: { available: true, status: "good", value: 40 },
        kcal: { available: true, status: "good", value: 420 },
        fiber: { available: false, status: "missing" }
      },
      missing: ["fiber"]
    },
    ...overrides
  };
}

function createFixture(createMealReviewAI, callAI) {
  return createMealReviewAI({ callAI, pickLang, getEvaluationCount });
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createMealReviewAI } = await load();
      return callback(callAI => createFixture(createMealReviewAI, callAI));
    });
  });
}

contractTest("builds the exact structured payload and requests 350 tokens", async createFixture => {
  const calls = [];
  const api = createFixture((prompt, maxTokens) => {
    calls.push({ prompt, maxTokens });
    return Promise.resolve("Explanation");
  });

  assert.equal(await api.requestMealReviewExplanation(review(), "pt"), "Explanation");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].maxTokens, 350);
  assert.match(calls[0].prompt, /^Explique brevemente a avaliação nutricional abaixo em português do Brasil\./);

  const jsonStart = calls[0].prompt.indexOf("{\n");
  assert.ok(jsonStart > 0);
  assert.deepEqual(JSON.parse(calls[0].prompt.slice(jsonStart)), {
    algorithmVersion: "meal-score-v2",
    finalScore: 4.57,
    coverage: 88,
    evaluatedNutrients: { evaluated: 2, total: 3 },
    hoursUntilMidnight: 2.35,
    nutrients: {
      protein: { available: true, status: "good", value: 40 },
      kcal: { available: true, status: "good", value: 420 },
      fiber: { available: false, status: "missing" }
    },
    missingNutrients: ["fiber"],
    foods: [
      { name: "Chicken", quantity: 150, unit: "g" },
      { name: "Rice", quantity: 90, unit: "g" }
    ]
  });
});

contractTest("selects the existing English and Spanish prompts for different reviews", async createFixture => {
  const prompts = [];
  const api = createFixture((prompt, maxTokens) => {
    prompts.push({ prompt, maxTokens });
    return Promise.resolve("ok");
  });
  const secondReview = review({
    items: [{ name: "Yogurt", qty: 1, unit: "un" }],
    result: {
      algorithmVersion: "alternate",
      score: 2,
      coverage: 0.5,
      hoursLeft: 12,
      components: { protein: { available: true } },
      missing: []
    }
  });

  await api.requestMealReviewExplanation(review(), "en");
  await api.requestMealReviewExplanation(secondReview, "es");

  assert.match(prompts[0].prompt, /^Briefly explain the nutrition assessment below in American English\./);
  assert.match(prompts[1].prompt, /^Explica brevemente en español la evaluación nutricional siguiente\./);
  assert.deepEqual(prompts.map(call => call.maxTokens), [350, 350]);
  const spanishPayload = JSON.parse(prompts[1].prompt.slice(prompts[1].prompt.indexOf("{\n")));
  assert.deepEqual(spanishPayload.foods, [{ name: "Yogurt", quantity: 1, unit: "un" }]);
  assert.equal(spanishPayload.finalScore, 2);
  assert.equal(spanishPayload.coverage, 50);
});

contractTest("returns successful explanatory text unchanged", async createFixture => {
  const api = createFixture(() => Promise.resolve("Keep this exact text."));
  assert.equal(
    await api.requestMealReviewExplanation(review(), "en"),
    "Keep this exact text."
  );
});

contractTest("lets the React-style host silently neutralize a Groq rejection", async createFixture => {
  const groqError = new Error("Groq unavailable");
  const api = createFixture(() => Promise.reject(groqError));
  let displayedText = "previous";
  let notified = false;

  const explanationRequest = api.requestMealReviewExplanation(review(), "pt");
  try {
    displayedText = await explanationRequest;
  } catch (_) {
    displayedText = "";
  }

  assert.equal(displayedText, "");
  assert.equal(notified, false);
});

contractTest("normalizes malformed-review prompt failures into the asynchronous request path", async createFixture => {
  let aiCalls = 0;
  const api = createFixture(() => {
    aiCalls++;
    return Promise.resolve("unused");
  });

  await assert.rejects(
    api.requestMealReviewExplanation({ result: null, items: [] }, "pt"),
    TypeError
  );
  assert.equal(aiCalls, 0);
});
