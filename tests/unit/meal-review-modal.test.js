const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../meal-review-modal.js"))],
  ["ESM", () => import("../../src/components/meal-review-modal.js")]
];

const { pickLang } = createI18n();

function walk(node, visit) {
  if (node == null || typeof node === "boolean") return;
  if (typeof node !== "object") return;
  visit(node);
  React.Children.toArray(node.props && node.props.children).forEach(child => walk(child, visit));
}

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

function baseProps(overrides = {}) {
  const result = {
    score: 4.25,
    hoursLeft: 5.4,
    valid: true,
    coverage: 0.95,
    confidence: "high",
    provisional: false,
    provisionalReasons: [],
    missing: ["salt"],
    components: {
      protein: {
        key: "protein", available: true, score: 0.9, mealAmount: 25,
        quota: 30, candidateComplete: true
      },
      salt: { key: "salt", available: false }
    }
  };
  return {
    review: { meal: "Almo\u00e7o", items: [], source: "staged", result },
    lang: "pt",
    darkMode: true,
    isMobileView: false,
    helpOpen: false,
    aiLoading: false,
    aiText: "",
    saving: false,
    getMealLabel: value => value,
    getEvaluationText: () => "Nutrientes avaliados: 1 de 2",
    getBrief: () => "Pontos fortes: Prote\u00edna.",
    getScoreLabel: key => ({ protein: "Prote\u00edna", fiber: "Fibra", salt: "Sal" })[key] || key,
    onClose: () => {},
    onToggleHelp: () => {},
    onReevaluate: () => {},
    onConfirm: () => {},
    ...overrides
  };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createMealReviewModal } = await load();
      const { MealReviewModal } = createMealReviewModal({ React, pickLang });
      return callback(MealReviewModal);
    });
  });
}

contractTest("returns null without a review and renders the current assessment snapshot", MealReviewModal => {
  assert.equal(MealReviewModal(baseProps({ review: null })), null);
  const modal = MealReviewModal(baseProps());
  const copy = textContent(modal);
  assert.equal(modal.props["data-theme"], "dark");
  assert.match(copy, /4\.25/);
  assert.match(copy, /Adequação ao restante do dia/);
  assert.match(copy, /Bem alinhada/);
  assert.match(copy, /Confiança dos dados: Alta · 95% de cobertura/);
  assert.match(copy, /Faixas: 0–2,99 pouco alinhada/);
  assert.match(copy, /N\u00e3o avaliados: Sal\./);
  assert.match(copy, /explica\u00e7\u00e3o por IA est\u00e1 temporariamente indispon\u00edvel/);
});

contractTest("explains provisional reasons exactly in PT, EN, and ES", MealReviewModal => {
  const cases = [
    ["pt", /Nota provisória/, /Fibra: faltam dados em 1 de 2 alimentos desta refeição\./],
    ["en", /Provisional score/, /Fiber: data is missing for 1 of 2 foods in this meal\./],
    ["es", /Nota provisional/, /Fibra: faltan datos en 1 de 2 alimentos de esta comida\./]
  ];

  cases.forEach(([lang, heading, reason]) => {
    const props = baseProps({
      lang,
      getScoreLabel: key => ({
        pt: { fiber: "Fibra" },
        en: { fiber: "Fiber" },
        es: { fiber: "Fibra" }
      })[lang][key] || key
    });
    props.review = {
      ...props.review,
      result: {
        ...props.review.result,
        score: 3.4,
        coverage: 0.75,
        confidence: "medium",
        provisional: true,
        provisionalReasons: [{
          nutrient: "fiber",
          scope: "candidate",
          missingItemCount: 1,
          totalItemCount: 2
        }]
      }
    };
    const copy = textContent(MealReviewModal(props));
    assert.match(copy, heading);
    assert.match(copy, reason);
  });
});

contractTest("labels the score as contextual and explicitly non-diagnostic", MealReviewModal => {
  const modal = MealReviewModal(baseProps({ helpOpen: true, lang: "en" }));
  const copy = textContent(modal);
  assert.match(copy, /Fit with the rest of the day/);
  assert.match(copy, /It does not measure absolute health, make a diagnosis, or replace professional guidance\./);
  assert.match(copy, /Confidence measures data completeness only: high ≥90%, medium 70–89%, low <70%\./);
});

contractTest("renders loading/help states and delegates all four actions", MealReviewModal => {
  const calls = [];
  const modal = MealReviewModal(baseProps({
    helpOpen: true,
    aiLoading: true,
    onClose: () => calls.push("close"),
    onToggleHelp: () => calls.push("help"),
    onReevaluate: () => calls.push("reevaluate"),
    onConfirm: () => calls.push("confirm")
  }));
  assert.match(textContent(modal), /Analisando\.\.\./);
  assert.match(textContent(modal), /Refer\u00eancia para agora:/);
  const buttons = [];
  walk(modal, node => {
    if (node.type === "button") buttons.push(node);
  });
  buttons.find(button => textContent(button).includes("O que estou vendo?")).props.onClick();
  buttons.find(button => textContent(button) === "Editar").props.onClick();
  buttons.find(button => textContent(button) === "Reavaliar").props.onClick();
  buttons.find(button => textContent(button) === "Registrar mesmo assim").props.onClick();
  assert.deepEqual(calls, ["help", "close", "reevaluate", "confirm"]);
});

contractTest("disables final confirmation while persistence is in progress", MealReviewModal => {
  const modal = MealReviewModal(baseProps({ saving: true }));
  const buttons = [];
  walk(modal, node => {
    if (node.type === "button") buttons.push(node);
  });
  const confirm = buttons.find(button => textContent(button) === "Registrar mesmo assim");

  assert.equal(confirm.props.disabled, true);
  assert.equal(confirm.props.style.cursor, "wait");
});
