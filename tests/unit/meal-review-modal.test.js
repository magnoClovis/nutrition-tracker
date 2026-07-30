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
    getMealLabel: value => value,
    getEvaluationText: () => "Nutrientes avaliados: 1 de 2",
    getBrief: () => "Pontos fortes: Prote\u00edna.",
    getScoreLabel: key => ({ protein: "Prote\u00edna", salt: "Sal" })[key] || key,
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
  assert.match(copy, /N\u00e3o avaliados: Sal\./);
  assert.match(copy, /explica\u00e7\u00e3o por IA est\u00e1 temporariamente indispon\u00edvel/);
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
