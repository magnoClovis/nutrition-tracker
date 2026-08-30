const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../ga-result-card.js"))],
  ["ESM", () => import("../../src/components/ga-result-card.js")]
];

const { pickLang } = createI18n();

function textContent(node) {
  const parts = [];
  function collect(value) {
    if (value == null || typeof value === "boolean") return;
    if (typeof value === "string" || typeof value === "number") {
      parts.push(String(value));
      return;
    }
    React.Children.toArray(value.props && value.props.children).forEach(collect);
  }
  collect(node);
  return parts.join("");
}

function findButton(node, label) {
  let found;
  function visit(value) {
    if (!value || typeof value !== "object" || found) return;
    if (value.type === "button" && textContent(value) === label) found = value;
    React.Children.toArray(value.props && value.props.children).forEach(visit);
  }
  visit(node);
  return found;
}

const result = {
  protein: 30,
  kcal: 400,
  fit: 1.234,
  items: [{
    food: {
      name: "Aveia", unit: "g", protein100: 10, kcal100: 200,
      carbs100: 60, fat100: 7, fiber100: 8, satfat100: 1, salt100: 0.2
    },
    gene: 1.5
  }]
};

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createGaResultCard } = await load();
      const { GaResultCard } = createGaResultCard({ React, pickLang });
      return callback(GaResultCard);
    });
  });
}

contractTest("preserves current-day projections, ranking, and item quantities", GaResultCard => {
  let evaluated;
  const card = GaResultCard({
    result,
    index: 0,
    activeLog: { "Almo\u00e7o": [{ protein: 50, kcal: 600 }] },
    goals: { protein: 100, kcal: 1200 },
    lang: "pt",
    isMobileView: false,
    evaluateMealItems: entries => {
      evaluated = entries;
      return { valid: true, score: 4.1 };
    },
    getMealScoreBrief: () => "Resumo",
    getMealScoreEvaluationText: () => "4 de 4",
    onAdd: () => {}
  });
  const copy = textContent(card);
  assert.deepEqual(evaluated, [{
    protein: 15, kcal: 300, carbs: 90, fat: 10.5,
    fiber: 12, satfat: 1.5, salt: 0.30000000000000004
  }]);
  assert.match(copy, /Melhor op\u00e7\u00e3o/);
  assert.match(copy, /Prote\u00edna depois: 80 \/ 100g \(80%\)/);
  assert.match(copy, /Calorias depois: 1000 \/ 1200kcal \(83%\)/);
  assert.match(copy, /Aveia: 150g/);
});

contractTest("preserves zero-goal fallbacks, absent fit, and delegates add", GaResultCard => {
  let added;
  const card = GaResultCard({
    result: { ...result, fit: undefined, protein: 0, kcal: 0, items: [] },
    index: 1,
    activeLog: {},
    goals: { protein: 0, kcal: 0 },
    lang: "en",
    isMobileView: true,
    evaluateMealItems: () => null,
    getMealScoreBrief: () => "",
    getMealScoreEvaluationText: () => "",
    onAdd: value => { added = value; }
  });
  assert.match(textContent(card), /Strong option/);
  assert.doesNotMatch(textContent(card), /fit /);
  findButton(card, "Add to diary").props.onClick();
  assert.equal(added.items.length, 0);
});
