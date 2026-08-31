const test = require("node:test");
const assert = require("node:assert/strict");
const { createI18n } = require("../../i18n.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../nutrition-feedback-ai.js"))],
  ["ESM", () => import("../../src/composite/nutrition-feedback-ai.js")]
];

const { normalizeLanguage, pickLang } = createI18n();

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
          salt: 0.1,
          sugars: 4.2,
          satfat: 0.7
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
          salt: 0.8,
          sugars: 0,
          satfat: 2.1
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
    pickLang
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
  assert.ok(fixture.calls[0].prompt.includes("PROMPT CONTRACT: nutrition-feedback-v2"));
  assert.ok(fixture.calls[0].prompt.includes("Metas calculadas em uso: 2000 kcal, 140g proteína"));
  assert.ok(fixture.calls[0].prompt.includes("Data: 2026-07-18 | DIA DE TREINO"));
  assert.ok(fixture.calls[0].prompt.includes("Café da manhã:\n  - Aveia (50g) - proteína: 8g, calorias: 190kcal, carboidratos: 32g, gordura: 4g, fibra: 5g, sal: 0g, açúcares: 4g, gordura saturada: 1g"));
  assert.ok(fixture.calls[0].prompt.includes("Proteína: 49g (35% da meta)"));
  assert.ok(fixture.calls[0].prompt.includes("Calorias: 451kcal (23% da meta)"));
  assert.ok(fixture.calls[0].prompt.includes("Açúcares: 4.2g"));
  assert.doesNotMatch(fixture.calls[0].prompt, /Nome: Ana|70kg|170cm|IMC atual:|Gênero informado:|Idade calculada:/);
});

contractTest("keeps the Spanish prompt localized while excluding raw profile data", async createFixture => {
  const fixture = createFixture();
  const snapshot = baseSnapshot({
    lang: "es",
    userName: "",
    day: { isTraining: false },
    goalContext: { baseActivityFactor: 0 }
  });
  await fixture.api.generateNutritionFeedback(snapshot);

  const prompt = fixture.calls[0].prompt;
  assert.ok(prompt.includes("=== CONTEXTO NUTRICIONAL Y METAS CALCULADAS ==="));
  assert.ok(prompt.includes("Fecha: 2026-07-18 | DÍA DE DESCANSO"));
  assert.ok(prompt.includes("Azúcares"));
  assert.ok(prompt.includes("Grasa saturada"));
  assert.doesNotMatch(prompt, /Nombre:|Peso|Altura|IMC|Sexo|actividad física/i);
});

contractTest("builds the English weekly prompt from calculated context only", async createFixture => {
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
      saltGoal: 5,
      sugars: 35,
      satfat: 18
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
      saltGoal: 5,
      sugars: 45,
      satfat: 22
    }]
  });
  await fixture.api.generateNutritionFeedback(snapshot);

  const prompt = fixture.calls[0].prompt;
  assert.ok(prompt.includes("=== CALCULATED NUTRITION CONTEXT AND TARGETS ==="));
  assert.ok(prompt.includes("=== WEEK SUMMARY (2 logged days) ==="));
  assert.ok(prompt.includes("Protein: 140g/day | Calories: 2000kcal/day | Carbs: 220g/day"));
  assert.ok(prompt.includes("Salt: 5g/day"));
  assert.ok(prompt.includes("Sugars: 40g/day"));
  assert.ok(prompt.includes("Saturated fat: 20g/day"));
  assert.doesNotMatch(prompt, /sodium\/salt/i);
  assert.doesNotMatch(prompt, /Name: Ana|70kg|170cm|Current BMI:|Reported sex:|Physical activity level:|Current goal: weight loss/i);
  assert.ok(prompt.includes("Days that hit the protein target: 1/2"));
});

contractTest("keeps missing daily nutrients unknown with exact PT EN ES coverage reasons", async createFixture => {
  const cases = [{
    lang: "pt",
    unknown: "desconhecido",
    proteinGap: "Proteína: subtotal conhecido 10g; faltam dados para 1 de 2 alimentos",
    carbsGap: "Carbs: subtotal conhecido 20g; faltam dados para 1 de 2 alimentos"
  }, {
    lang: "en",
    unknown: "unknown",
    proteinGap: "Protein: known subtotal 10g; data missing for 1 of 2 foods",
    carbsGap: "Carbs: known subtotal 20g; data missing for 1 of 2 foods"
  }, {
    lang: "es",
    unknown: "desconocido",
    proteinGap: "Proteína: subtotal conocido 10g; faltan datos para 1 de 2 alimentos",
    carbsGap: "Carbohidratos: subtotal conocido 20g; faltan datos para 1 de 2 alimentos"
  }];

  for (const expected of cases) {
    const fixture = createFixture(["feedback"]);
    await fixture.api.generateNutritionFeedback(baseSnapshot({
      lang: expected.lang,
      day: {
        activeLog: {
          "Café da manhã": [
            { name: "A", qty: 1, unit: "un", protein: 10, kcal: 100, carbs: null, fat: 0, fiber: null, salt: null },
            { name: "B", qty: 1, unit: "un", protein: null, kcal: 50, carbs: 20, fat: null, fiber: 5, salt: 1 }
          ]
        }
      }
    }));

    const prompt = fixture.calls[0].prompt;
    assert.ok(prompt.includes(expected.unknown));
    assert.ok(prompt.includes(expected.proteinGap));
    assert.ok(prompt.includes(expected.carbsGap));
    assert.doesNotMatch(prompt, /(?:prot|protein|proteína): 0g.*(?:A|B)/i);
  }
});

contractTest("averages weekly nutrients only across complete days", async createFixture => {
  const fixture = createFixture();
  await fixture.api.generateNutritionFeedback(baseSnapshot({
    type: "week",
    lang: "en",
    week: [{
      hasData: true,
      date: "2026-07-14",
      protein: 130,
      proteinGoal: 140,
      metProtein: false,
      kcal: 1900,
      kcalGoal: 2000,
      carbs: 20,
      carbsGoal: 220,
      fat: 60,
      fatGoal: 65,
      fiber: 28,
      fiberGoal: 30,
      salt: 4.5,
      saltGoal: 5,
      nutrientCoverage: {
        protein: { knownItemCount: 2, missingItemCount: 0, totalItemCount: 2, complete: true },
        kcal: { knownItemCount: 2, missingItemCount: 0, totalItemCount: 2, complete: true },
        carbs: { knownItemCount: 0, missingItemCount: 2, totalItemCount: 2, complete: false },
        fat: { knownItemCount: 2, missingItemCount: 0, totalItemCount: 2, complete: true },
        fiber: { knownItemCount: 2, missingItemCount: 0, totalItemCount: 2, complete: true },
        salt: { knownItemCount: 2, missingItemCount: 0, totalItemCount: 2, complete: true }
      }
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
      saltGoal: 5,
      nutrientCoverage: Object.fromEntries(
        ["protein", "kcal", "carbs", "fat", "fiber", "salt"].map(field => [
          field,
          { knownItemCount: 2, missingItemCount: 0, totalItemCount: 2, complete: true }
        ])
      )
    }]
  }));

  const prompt = fixture.calls[0].prompt;
  assert.ok(prompt.includes("carbs: unknown (data missing for 2 of 2 foods)/220g"));
  assert.ok(prompt.includes("Carbs: 230g/day (1/2 days with complete data)"));
  assert.doesNotMatch(prompt, /Carbs: 125g\/day/);
});

contractTest("returns the neutral no-week-data status without calling the AI provider", async createFixture => {
  const fixture = createFixture();
  const result = await fixture.api.generateNutritionFeedback(baseSnapshot({
    type: "week",
    week: [{ hasData: false, date: "2026-07-18" }]
  }));

  assert.deepEqual(result, { status: "no-week-data" });
  assert.equal(fixture.calls.length, 0);
});

contractTest("propagates provider errors for the localized React handler", async createFixture => {
  const groqError = new Error("provider unavailable");
  const fixture = createFixture([groqError]);

  await assert.rejects(
    fixture.api.generateNutritionFeedback(baseSnapshot()),
    error => error === groqError
  );
  assert.equal(fixture.calls.length, 1);
});

