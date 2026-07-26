const test = require("node:test");
const assert = require("node:assert/strict");
const { createI18n } = require("../../i18n.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../food-autofill-ai.js"))],
  ["ESM", () => import("../../src/composite/food-autofill-ai.js")]
];

const { normalizeLanguage, pickLang } = createI18n();
const languageInstructions = {
  pt: "\nResponda em português do Brasil.\n",
  en: "\nRespond in American English.\n",
  es: "\nResponde en español.\n"
};

function createFixture(createFoodAutofillAI, aiResponses = []) {
  const calls = [];
  const queue = [...aiResponses];
  let activeLang = "pt";
  const api = createFoodAutofillAI({
    callAI(prompt, maxTokens) {
      calls.push({ prompt, maxTokens });
      const next = queue.shift();
      if (next instanceof Error) return Promise.reject(next);
      return Promise.resolve(next ?? '{"ok":true}');
    },
    normalizeLanguage,
    pickLang,
    getAiLanguageInstruction: () => languageInstructions[normalizeLanguage(activeLang)]
  });
  return {
    api,
    calls,
    setActiveLang(lang) { activeLang = lang; }
  };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createFoodAutofillAI } = await load();
      return callback(responses => createFixture(createFoodAutofillAI, responses));
    });
  });
}

contractTest("builds the localized common and per-unit prompts for PT, EN, and ES", async createFixture => {
  const cases = [
    { lang: "pt", unit: "g", start: 'O usuário quer registrar "Banana" com unidade "g".', marker: "Responda APENAS com JSON sem markdown" },
    { lang: "pt", unit: "un", start: 'Verifique se existe o alimento "Banana" e se faz sentido medir em unidades individuais.', marker: "valor_100g x peso_unidade / 100" },
    { lang: "en", unit: "g", start: 'The user wants to log "Banana" with unit "g".', marker: "Respond ONLY with JSON, no markdown" },
    { lang: "en", unit: "un", start: 'Check whether the food "Banana" exists and whether it makes sense to measure it as individual units.', marker: "value_per_100g x unit_weight / 100" },
    { lang: "es", unit: "g", start: 'El usuario quiere registrar "Banana" con unidad "g".', marker: "Responde SOLO con JSON, sin markdown" },
    { lang: "es", unit: "un", start: 'Verifica si existe el alimento "Banana" y si tiene sentido medirlo en unidades individuales.', marker: "valor_100g x peso_unidad / 100" }
  ];
  const fixture = createFixture(cases.map(({ unit }) => unit === "un"
    ? '{"ok":true,"per100":{},"unitWeightG":100}'
    : '{"ok":true}'));

  for (const expected of cases) {
    fixture.setActiveLang(expected.lang);
    await fixture.api.requestFoodAutofill({ foodName: "  Banana  ", unit: expected.unit, lang: expected.lang });
    const call = fixture.calls.at(-1);
    assert.equal(call.maxTokens, 600);
    assert.ok(call.prompt.startsWith(languageInstructions[expected.lang] + expected.start));
    assert.ok(call.prompt.includes(expected.marker));
  }
});

contractTest("removes Markdown fences, parses JSON, and merges standard fields", async createFixture => {
  const fixture = createFixture([
    '```json\n{"ok":true,"protein100":12.5,"kcal100":null,"salt100":0}\n```'
  ]);
  const result = await fixture.api.requestFoodAutofill({ foodName: "Tofu", unit: "g", lang: "pt" });
  const currentForm = { protein100: "old", kcal100: "90", salt100: "old salt", untouched: "keep" };

  assert.equal(result.status, "success");
  assert.equal(result.mode, "standard");
  assert.deepEqual(fixture.api.applyFoodAutofillResult(currentForm, result), {
    protein100: "12.5",
    kcal100: "90",
    salt100: "0",
    untouched: "keep"
  });
});

contractTest("propagates malformed JSON for the React layer to report", async createFixture => {
  const fixture = createFixture(["```json\nnot-json\n```"]);
  await assert.rejects(
    fixture.api.requestFoodAutofill({ foodName: "Rice", unit: "g", lang: "en" }),
    SyntaxError
  );
});

contractTest("calculates per-unit fields proportionally and clears unitWeightG", async createFixture => {
  const fixture = createFixture([JSON.stringify({
    ok: true,
    per100: {
      protein100: 12.34,
      kcal100: 250,
      carbs100: null,
      sugars100: 3.333,
      fat100: 8,
      satfat100: 2,
      fiber100: 5,
      salt100: 0.5
    },
    unitWeightG: 37.5
  })]);
  const result = await fixture.api.requestFoodAutofill({ foodName: "Snack", unit: "un", lang: "pt" });
  const mapped = fixture.api.applyFoodAutofillResult({
    protein100: "old",
    kcal100: "old",
    carbs100: "keep carbs",
    sugars100: "old",
    unitWeightG: "37.5"
  }, result);

  assert.equal(result.mode, "unit");
  assert.equal(result.unitWeightG, 37.5);
  assert.equal(mapped.protein100, "4.63");
  assert.equal(mapped.kcal100, "93.75");
  assert.equal(mapped.sugars100, "1.25");
  assert.equal(mapped.carbs100, "keep carbs");
  assert.equal(mapped.unitWeightG, "");
});

contractTest("preserves every current nutrient whose AI value is null or absent", async createFixture => {
  const fixture = createFixture(['{"ok":true,"protein100":null,"kcal100":123}']);
  const result = await fixture.api.requestFoodAutofill({ foodName: "Food", unit: "ml", lang: "es" });
  const currentForm = {
    protein100: "7", kcal100: "90", carbs100: "11", sugars100: "2",
    fat100: "3", satfat100: "1", fiber100: "4", salt100: "0.5"
  };

  assert.deepEqual(fixture.api.applyFoodAutofillResult(currentForm, result), {
    ...currentForm,
    kcal100: "123"
  });
});

contractTest("returns an empty-name result without calling the AI", async createFixture => {
  const fixture = createFixture();
  assert.deepEqual(
    await fixture.api.requestFoodAutofill({ foodName: "   ", unit: "g", lang: "pt" }),
    { status: "empty-name" }
  );
  assert.equal(fixture.calls.length, 0);
});

contractTest("returns a neutral rejected result when the provider rejects the food/unit pair", async createFixture => {
  const fixture = createFixture(['{"ok":false,"reason":"unit mismatch"}']);
  assert.deepEqual(
    await fixture.api.requestFoodAutofill({ foodName: "Milk", unit: "un", lang: "en" }),
    { status: "rejected", reason: "unit mismatch" }
  );
});
