const test = require("node:test");
const assert = require("node:assert/strict");
const { createI18n } = require("../../i18n.js");
const { createDishDescriptionAI } = require("../../dish-description-ai.js");

const { normalizeLanguage } = createI18n();
const languageInstructions = {
  pt: "\nResponda em português do Brasil.\n",
  en: "\nRespond in American English.\n",
  es: "\nResponde en español.\n"
};

function createFixture(aiResponses = [], entryIds = ["entry-1"]) {
  const calls = [];
  const responseQueue = [...aiResponses];
  const idQueue = [...entryIds];
  let activeLang = "pt";
  const api = createDishDescriptionAI({
    callAI(prompt, maxTokens) {
      calls.push({ prompt, maxTokens });
      const next = responseQueue.shift();
      if (next instanceof Error) return Promise.reject(next);
      return Promise.resolve(next ?? "{}");
    },
    normalizeLanguage,
    getAiLanguageInstruction: () => languageInstructions[normalizeLanguage(activeLang)],
    createEntryId: () => idQueue.shift()
  });
  return {
    api,
    calls,
    setActiveLang(lang) { activeLang = lang; }
  };
}

test("estimates a dish with the exact token limit and builds the historical diary entry", async () => {
  const fixture = createFixture([
    '```json\n{"name":"Frango com arroz","protein":42,"kcal":610,"carbs":68,"fat":18,"fiber":7,"salt":1.4,"confidence":"alta","note":"estimativa"}\n```'
  ], ["17000000000000.25"]);

  const estimate = await fixture.api.requestDishEstimate({
    description: "  frango grelhado com arroz  ",
    lang: "pt"
  });
  const entry = fixture.api.buildDescribedEntry({
    estimate: estimate.result,
    description: "  descrição editada depois da estimativa  "
  });

  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.calls[0].maxTokens, 600);
  assert.ok(fixture.calls[0].prompt.startsWith(
    languageInstructions.pt + "Analise o seguinte prato e estime seus valores nutricionais totais."
  ));
  assert.ok(fixture.calls[0].prompt.includes('Descrição do prato:\n"frango grelhado com arroz"'));
  assert.ok(fixture.calls[0].prompt.includes("14. Responda APENAS com JSON válido, sem markdown, sem comentários e sem texto adicional."));
  assert.deepEqual(entry, {
    id: "17000000000000.25",
    foodId: null,
    name: "Frango com arroz",
    qty: 1,
    unit: "un",
    protein: 42,
    kcal: 610,
    carbs: 68,
    fat: 18,
    fiber: 7,
    salt: 1.4,
    sugars: null,
    satfat: null,
    _estimated: true,
    _description: "descrição editada depois da estimativa"
  });
});

test("keeps the localized English and Spanish prompt contracts", async () => {
  const fixture = createFixture(["{}", "{}"]);
  const cases = [
    {
      lang: "en",
      start: "Analyze the following dish and estimate its total nutrition values.",
      confidence: '"confidence":"high|medium|low"'
    },
    {
      lang: "es",
      start: "Analiza el siguiente plato y estima sus valores nutricionales totales.",
      confidence: '"confidence":"alta|media|baja"'
    }
  ];

  for (const expected of cases) {
    fixture.setActiveLang(expected.lang);
    await fixture.api.requestDishEstimate({ description: "dish", lang: expected.lang });
    const prompt = fixture.calls.at(-1).prompt;
    assert.ok(prompt.startsWith(languageInstructions[expected.lang] + expected.start));
    assert.ok(prompt.includes(expected.confidence));
  }
});

test("returns an empty-description result without calling the AI", async () => {
  const fixture = createFixture();
  assert.deepEqual(
    await fixture.api.requestDishEstimate({ description: "   ", lang: "pt" }),
    { status: "empty-description" }
  );
  assert.equal(fixture.calls.length, 0);
});

test("propagates Groq and malformed-JSON errors for the localized React warning", async () => {
  const networkError = new TypeError("network unavailable");
  const fixture = createFixture([networkError, "```json\nnot-json\n```"]);

  await assert.rejects(
    fixture.api.requestDishEstimate({ description: "first", lang: "en" }),
    error => error === networkError
  );
  await assert.rejects(
    fixture.api.requestDishEstimate({ description: "second", lang: "es" }),
    SyntaxError
  );
});

test("uses zero for every missing nutrient without adding time or foodSnapshot", () => {
  const fixture = createFixture([], ["entry-missing"]);
  const entry = fixture.api.buildDescribedEntry({
    estimate: { name: "", protein: null, kcal: undefined, carbs: "", fat: 0 },
    description: "  prato sem nutrientes completos  "
  });

  assert.deepEqual(entry, {
    id: "entry-missing",
    foodId: null,
    name: "Prato estimado",
    qty: 1,
    unit: "un",
    protein: 0,
    kcal: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    salt: 0,
    sugars: null,
    satfat: null,
    _estimated: true,
    _description: "prato sem nutrientes completos"
  });
  assert.equal("time" in entry, false);
  assert.equal("foodSnapshot" in entry, false);
});

test("returns undefined without consuming an ID when no estimate exists", () => {
  let idCalls = 0;
  const api = createDishDescriptionAI({
    callAI: async () => "{}",
    normalizeLanguage,
    getAiLanguageInstruction: () => languageInstructions.pt,
    createEntryId: () => { idCalls += 1; return "unused"; }
  });

  assert.equal(api.buildDescribedEntry({ estimate: null, description: "ignored" }), undefined);
  assert.equal(idCalls, 0);
});
