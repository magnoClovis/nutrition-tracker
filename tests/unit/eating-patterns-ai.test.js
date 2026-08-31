const test = require("node:test");
const assert = require("node:assert/strict");
const { createI18n } = require("../../i18n.js");
const { createGoalCalculator } = require("../../goal-calculator.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../eating-patterns-ai.js"))],
  ["ESM", () => import("../../src/composite/eating-patterns-ai.js")]
];

const { pickLang } = createI18n();
const { computeGoals } = createGoalCalculator();

function getWeightForDate(history, date) {
  return [...history].filter(entry => entry.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

function food(id, protein, kcal, carbs = 0, fiber = 0, fat = 0, salt = 0, sugars = 0, satfat = 0) {
  return { id, protein, kcal, carbs, fiber, fat, salt, sugars, satfat };
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

function createFixture(createEatingPatternsAI, responses = ["analysis"]) {
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

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createEatingPatternsAI } = await load();
      return callback(responses => createFixture(createEatingPatternsAI, responses));
    });
  });
}

contractTest("builds the Portuguese prompt from present logs while empty days remain absent", async createFixture => {
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
  assert.ok(fixture.calls[0].prompt.includes("Médias diárias: proteína: 120g | calorias: 2000 kcal"));
  assert.ok(fixture.calls[0].prompt.includes("Dias que atingiram meta de proteína: 1/2"));
  assert.ok(fixture.calls[0].prompt.includes("Variação de proteína: mín 100g, máx 140g"));
  assert.ok(fixture.calls[0].prompt.includes("açúcares: 0g"));
  assert.ok(fixture.calls[0].prompt.includes("gordura saturada: 0g"));
  assert.doesNotMatch(fixture.calls[0].prompt, /Peso atual|71kg|1990-01-01|female/);
});

contractTest("preserves separate training and rest summaries in the English prompt", async createFixture => {
  const fixture = createFixture();
  const snapshot = baseSnapshot({ lang: "en" });
  await fixture.api.generateEatingPatterns(snapshot);

  const prompt = fixture.calls[0].prompt;
  assert.ok(prompt.includes("DATA (2 logged days out of 30)"));
  assert.ok(prompt.includes("Training days (1): average protein 100g, calories 1800 kcal"));
  assert.ok(prompt.includes("Rest days (1): average protein 140g, calories 2200 kcal"));
  assert.ok(prompt.includes("Protein range: min 100g, max 140g"));
  assert.ok(prompt.includes("sugars 0g"));
  assert.ok(prompt.includes("saturated fat 0g"));
  assert.ok(prompt.includes("Do not diagnose or make absolute-health claims"));
});

contractTest("uses default training and historical goals without normalizing meal keys", async createFixture => {
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
  assert.ok(prompt.includes("Días de entrenamiento (1): media proteína 95g, calorías 1700 kcal"));
});

contractTest("excludes incomplete days from averages and explains missing nutrients in PT EN ES", async createFixture => {
  const cases = [{
    lang: "pt",
    average: "Médias diárias: proteína: 80g (1/2 dias com dados completos)",
    limitation: "proteína: faltam dados para 1 alimento em 1 dia"
  }, {
    lang: "en",
    average: "Daily averages: protein: 80g (1/2 days with complete data)",
    limitation: "protein: data missing for 1 food across 1 day"
  }, {
    lang: "es",
    average: "Medias diarias: proteína: 80g (1/2 días con datos completos)",
    limitation: "proteína: faltan datos para 1 alimento en 1 día"
  }];

  for (const expected of cases) {
    const fixture = createFixture();
    await fixture.api.generateEatingPatterns(baseSnapshot({
      lang: expected.lang,
      days: [{
        date: "2026-07-17",
        log: { Almoço: [food("known", 80, 1200, 100, 12)] }
      }, {
        date: "2026-07-16",
        log: {
          Almoço: [
            food("partial", 40, 600, 50, 6),
            { id: "missing", protein: null, kcal: 400, carbs: null, fiber: null, fat: null, salt: null, sugars: null, satfat: null }
          ]
        }
      }]
    }));

    const prompt = fixture.calls[0].prompt;
    assert.ok(prompt.includes(expected.average));
    assert.ok(prompt.includes(expected.limitation));
    assert.doesNotMatch(prompt, /proteína: 60g|protein: 60g/);
  }
});

contractTest("includes all available nutrients and never serializes raw profile data", async createFixture => {
  const labels = {
    pt: ["açúcares: 7g", "gordura saturada: 3g"],
    en: ["sugars: 7g", "saturated fat: 3g"],
    es: ["azúcares: 7g", "grasa saturada: 3g"]
  };
  for (const lang of ["pt", "en", "es"]) {
    const fixture = createFixture();
    await fixture.api.generateEatingPatterns(baseSnapshot({
      lang,
      currentWeight: 987,
      currentHeight: 321,
      profile: { birthDate: "1901-02-03", gender: "private-marker" },
      days: [{
        date: "2026-07-17",
        log: { Almoço: [food("all", 10, 200, 20, 4, 6, 0.5, 7, 3)] }
      }]
    }));
    const prompt = fixture.calls[0].prompt;
    for (const label of labels[lang]) assert.ok(prompt.includes(label));
    assert.doesNotMatch(prompt, /987kg|321cm|1901-02-03|private-marker/);
  }
});

contractTest("returns the neutral no-data result without calling the AI provider", async createFixture => {
  const fixture = createFixture();
  const empty = await fixture.api.generateEatingPatterns(baseSnapshot({ days: [] }));
  const onlyEmptyLogs = await fixture.api.generateEatingPatterns(baseSnapshot({
    days: [{ date: "2026-07-17", log: {} }]
  }));

  assert.deepEqual(empty, { status: "no-data" });
  assert.deepEqual(onlyEmptyLogs, { status: "no-data" });
  assert.equal(fixture.calls.length, 0);
});

contractTest("propagates provider and malformed parsed-log failures to the React handler", async createFixture => {
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

