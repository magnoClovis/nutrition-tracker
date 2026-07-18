const test = require("node:test");
const assert = require("node:assert/strict");
const { createI18n } = require("../../i18n.js");
const { createGoalCalculator } = require("../../goal-calculator.js");
const { createEatingPatternsAI } = require("../../eating-patterns-ai.js");

const { pickLang } = createI18n();
const { computeGoals } = createGoalCalculator();

function getWeightForDate(history, date) {
  return [...history].filter(entry => entry.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

function food(id, protein, kcal, carbs = 0, fiber = 0) {
  return { id, protein, kcal, carbs, fiber };
}

function baseSnapshot(overrides = {}) {
  const snapshot = {
    lang: "pt",
    today: "2026-07-18",
    days: [{
      date: "2026-07-17",
      log: {
        "Café da manhã": [food("a", 40, 800, 90, 8)],
        "Almoço": [food("b", 60, 1000, 110, 12)]
      }
    }, {
      date: "2026-07-16",
      log: {
        "Café da manhã": [food("c", 60, 1000, 100, 10)],
        "Almoço": [food("d", 80, 1200, 140, 14)]
      }
    }],
    trainingByDate: {
      "2026-07-17": true,
      "2026-07-16": false
    },
    weightHistory: [{
      date: "2026-07-01",
      weight: 70,
      height: 170
    }],
    currentWeight: 71,
    currentHeight: 171,
    profile: {
      birthDate: "1990-01-01",
      gender: "female"
    },
    nutritionPrefs: {
      activityLevel: "moderate",
      goalType: "maintenance",
      goalKg: "",
      goalWeeks: "",
      manualAdjustment: "",
      proteinMultiplier: ""
    },
    customGoals: {
      protein: 120,
      kcal: 2000,
      carbs: "",
      fat: "",
      fiber: "",
      salt: ""
    },
    goalHistory: {},
    mealKeys: ["Café da manhã", "Almoço"]
  };
  return {
    ...snapshot,
    ...overrides,
    profile: { ...snapshot.profile, ...(overrides.profile || {}) },
    nutritionPrefs: { ...snapshot.nutritionPrefs, ...(overrides.nutritionPrefs || {}) },
    customGoals: { ...snapshot.customGoals, ...(overrides.customGoals || {}) }
  };
}

function createFixture(responses = ["analysis"]) {
  const calls = [];
  const queue = [...responses];
  const api = createEatingPatternsAI({
    callAI(prompt, maxTokens) {
      calls.push({ prompt, maxTokens });
      const response = queue.shift();
      if (response instanceof Error) return Promise.reject(response);
      return Promise.resolve(response ?? "");
    },
    pickLang,
    computeGoals,
    getWeightForDate
  });
  return { api, calls };
}

test("builds the Portuguese prompt from present logs while empty days remain absent", async () => {
  const fixture = createFixture(["padrões"]);
  const snapshot = baseSnapshot({
    days: [
      ...baseSnapshot().days,
      { date: "2026-07-15", log: {} }
    ]
  });
  const result = await fixture.api.generateEatingPatterns(snapshot);

  assert.deepEqual(result, { status: "success", text: "padrões" });
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.calls[0].maxTokens, 1200);
  assert.ok(fixture.calls[0].prompt.includes("DADOS (2 dias registrados de 30)"));
  assert.ok(fixture.calls[0].prompt.includes("Média diária: 120g proteína, 2000 kcal"));
  assert.ok(fixture.calls[0].prompt.includes("Dias que atingiram meta de proteína: 1/2"));
  assert.ok(fixture.calls[0].prompt.includes("Variação de proteína: mín 100g, máx 140g"));
  assert.ok(fixture.calls[0].prompt.includes("Peso atual: 71kg"));
});

test("preserves separate training and rest summaries in the English prompt", async () => {
  const fixture = createFixture();
  const snapshot = baseSnapshot({ lang: "en" });
  await fixture.api.generateEatingPatterns(snapshot);

  const prompt = fixture.calls[0].prompt;
  assert.ok(prompt.includes("DATA (2 logged days out of 30)"));
  assert.ok(prompt.includes("Training days (1): average 100g protein, 1800 kcal"));
  assert.ok(prompt.includes("Rest days (1): average 140g protein, 2200 kcal"));
  assert.ok(prompt.includes("Protein range: min 100g, max 140g"));
});

test("uses default training and historical goals without normalizing meal keys", async () => {
  const fixture = createFixture();
  const snapshot = baseSnapshot({
    lang: "es",
    days: [{
      date: "2026-07-10",
      log: {
        Breakfast: [food("legacy", 95, 1700, 180, 20)]
      }
    }],
    trainingByDate: {},
    goalHistory: {
      "2026-07-10": { protein: 90, kcal: 1700 }
    }
  });
  await fixture.api.generateEatingPatterns(snapshot);

  const prompt = fixture.calls[0].prompt;
  assert.ok(prompt.includes("DATOS (1 días registrados de 30)"));
  assert.ok(prompt.includes("Días que alcanzaron la meta de proteína: 1/1"));
  assert.ok(prompt.includes("Días de entrenamiento (1): media 95g proteína, 1700 kcal"));
});

test("returns the neutral no-data result without calling Groq", async () => {
  const fixture = createFixture();
  const empty = await fixture.api.generateEatingPatterns(baseSnapshot({ days: [] }));
  const onlyEmptyLogs = await fixture.api.generateEatingPatterns(baseSnapshot({
    days: [{ date: "2026-07-17", log: {} }]
  }));

  assert.deepEqual(empty, { status: "no-data" });
  assert.deepEqual(onlyEmptyLogs, { status: "no-data" });
  assert.equal(fixture.calls.length, 0);
});

test("propagates Groq and malformed parsed-log failures to the React handler", async () => {
  const groqError = new Error("provider unavailable");
  const groqFixture = createFixture([groqError]);
  await assert.rejects(
    groqFixture.api.generateEatingPatterns(baseSnapshot()),
    error => error === groqError
  );

  const malformedFixture = createFixture();
  await assert.rejects(
    malformedFixture.api.generateEatingPatterns(baseSnapshot({
      days: [{ date: "2026-07-17", log: null }]
    })),
    TypeError
  );
  assert.equal(malformedFixture.calls.length, 0);
});

