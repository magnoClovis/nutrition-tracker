const test = require("node:test");
const assert = require("node:assert/strict");
const { createI18n } = require("../../i18n.js");
const { createGoalCalculator } = require("../../goal-calculator.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../nutrition-feedback-ai.js"))],
  ["ESM", () => import("../../src/composite/nutrition-feedback-ai.js")]
];

const { normalizeLanguage, pickLang } = createI18n();
const { ACTIVITY_LEVELS, calculateAge } = createGoalCalculator();

function baseSnapshot(overrides = {}) {
  const snapshot = {
    type: "day",
    lang: "pt",
    userName: "Ana",
    profile: {
      birthDate: "",
      gender: "female",
      currentWeight: 70,
      viewWeight: 69,
      currentHeight: 170,
      viewHeight: 169
    },
    preferences: {
      activityLevel: "moderate",
      goalType: "maintenance",
      goalKg: "",
      goalWeeks: ""
    },
    goalContext: {
      goals: {
        kcal: 2000,
        protein: 140,
        carbs: 220,
        fat: 65,
        fiber: 30,
        salt: 5
      },
      baseActivityFactor: 0,
      calorieBase: 2100,
      calorieAdjustment: -100,
      proteinMultiplier: 2
    },
    day: {
      viewDate: "2026-07-18",
      isTraining: true,
      mealOrder: ["Café da manhã", "Almoço"],
      mealLabels: {
        "Café da manhã": "Café da manhã",
        "Almoço": "Almoço"
      },
      activeLog: {
        "Café da manhã": [{
          name: "Aveia",
          qty: 50,
          unit: "g",
          protein: 8.4,
          kcal: 190.4,
          carbs: 32.2,
          fat: 3.8,
          fiber: 5.2,
          salt: 0.1
        }],
        "Almoço": [{
          name: "Frango",
          qty: 150,
          unit: "g",
          protein: 40.1,
          kcal: 260.2,
          carbs: 0,
          fat: 9.7,
          fiber: 0,
          salt: 0.8
        }]
      }
    },
    week: []
  };
  return {
    ...snapshot,
    ...overrides,
    profile: { ...snapshot.profile, ...(overrides.profile || {}) },
    preferences: { ...snapshot.preferences, ...(overrides.preferences || {}) },
    goalContext: {
      ...snapshot.goalContext,
      ...(overrides.goalContext || {}),
      goals: { ...snapshot.goalContext.goals, ...(overrides.goalContext?.goals || {}) }
    },
    day: { ...snapshot.day, ...(overrides.day || {}) }
  };
}

function createFixture(createNutritionFeedbackAI, responses = ["feedback"]) {
  const calls = [];
  const queue = [...responses];
  const api = createNutritionFeedbackAI({
    callAI(prompt, maxTokens) {
      calls.push({ prompt, maxTokens });
      const response = queue.shift();
      if (response instanceof Error) return Promise.reject(response);
      return Promise.resolve(response ?? "");
    },
    normalizeLanguage,
    pickLang,
    activityLevels: ACTIVITY_LEVELS,
    calculateAge
  });
  return { api, calls };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createNutritionFeedbackAI } = await load();
      return callback(responses => createFixture(createNutritionFeedbackAI, responses));
    });
  });
}

contractTest("builds the Portuguese daily prompt from the explicit snapshot", async createFixture => {
  const fixture = createFixture(["texto gerado"]);
  const result = await fixture.api.generateNutritionFeedback(baseSnapshot());

  assert.deepEqual(result, { status: "success", text: "texto gerado" });
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.calls[0].maxTokens, 1000);
  assert.ok(fixture.calls[0].prompt.includes("Nome: Ana"));
  assert.ok(fixture.calls[0].prompt.includes("Nível de atividade física: Moderadamente ativo - Exercicios moderados 3 a 5 vezes por semana | FA: 1.55"));
  assert.ok(fixture.calls[0].prompt.includes("Data: 2026-07-18 | DIA DE TREINO"));
  assert.ok(fixture.calls[0].prompt.includes("Café da manhã:\n  - Aveia (50g) - prot: 8g, 190kcal, carbs: 32g, gord: 4g"));
  assert.ok(fixture.calls[0].prompt.includes("Proteína: 49g (35% da meta)"));
  assert.ok(fixture.calls[0].prompt.includes("Calorias: 451kcal (23% da meta)"));
});

contractTest("keeps the Spanish activity-description quirk and factor fallback", async createFixture => {
  const fixture = createFixture();
  const snapshot = baseSnapshot({
    lang: "es",
    userName: "",
    day: { isTraining: false },
    goalContext: { baseActivityFactor: 0 }
  });
  await fixture.api.generateNutritionFeedback(snapshot);

  const prompt = fixture.calls[0].prompt;
  assert.equal(prompt.includes("Nombre:"), false);
  assert.ok(prompt.includes(
    "Nivel de actividad física: Moderately active - Moderate exercise 3 to 5 times per week | FA: 1.55"
  ));
  assert.equal(prompt.includes(ACTIVITY_LEVELS.moderate.descEs), false);
  assert.ok(prompt.includes("Fecha: 2026-07-18 | DÍA DE DESCANSO"));
});

contractTest("uses an explicit activity factor and builds the English weekly prompt", async createFixture => {
  const fixture = createFixture();
  const snapshot = baseSnapshot({
    type: "week",
    lang: "en",
    userName: "",
    preferences: { activityLevel: "light", goalType: "loss", goalKg: 4, goalWeeks: 8 },
    goalContext: { baseActivityFactor: 1.3 },
    week: [{
      hasData: true,
      date: "2026-07-14",
      protein: 130,
      proteinGoal: 140,
      metProtein: false,
      kcal: 1900,
      kcalGoal: 2000,
      carbs: 210,
      carbsGoal: 220,
      fat: 60,
      fatGoal: 65,
      fiber: 28,
      fiberGoal: 30,
      salt: 4.5,
      saltGoal: 5
    }, {
      hasData: true,
      date: "2026-07-15",
      protein: 150,
      proteinGoal: 140,
      metProtein: true,
      kcal: 2100,
      kcalGoal: 2000,
      carbs: 230,
      carbsGoal: 220,
      fat: 70,
      fatGoal: 65,
      fiber: 32,
      fiberGoal: 30,
      salt: 5.5,
      saltGoal: 5
    }]
  });
  await fixture.api.generateNutritionFeedback(snapshot);

  const prompt = fixture.calls[0].prompt;
  assert.ok(prompt.includes("Physical activity level: Lightly active - Light exercise 1 to 3 times per week | AF: 1.3"));
  assert.ok(prompt.includes("Current goal: weight loss (4kg in 8 weeks)"));
  assert.ok(prompt.includes("=== WEEK SUMMARY (2 logged days) ==="));
  assert.ok(prompt.includes("Protein: 140g/day | Calories: 2000kcal/day | Carbs: 220g/day"));
  assert.ok(prompt.includes("Days that hit the protein target: 1/2"));
});

contractTest("returns the neutral no-week-data status without calling Groq", async createFixture => {
  const fixture = createFixture();
  const result = await fixture.api.generateNutritionFeedback(baseSnapshot({
    type: "week",
    week: [{ hasData: false, date: "2026-07-18" }]
  }));

  assert.deepEqual(result, { status: "no-week-data" });
  assert.equal(fixture.calls.length, 0);
});

contractTest("propagates Groq errors for the unchanged localized React handler", async createFixture => {
  const groqError = new Error("provider unavailable");
  const fixture = createFixture([groqError]);

  await assert.rejects(
    fixture.api.generateNutritionFeedback(baseSnapshot()),
    error => error === groqError
  );
  assert.equal(fixture.calls.length, 1);
});

