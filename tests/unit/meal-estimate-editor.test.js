const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const { createMealEstimate } = require("../../meal-estimate.js");

const implementations = [
  ["UMD", () => Promise.resolve(require("../../meal-estimate-editor.js"))],
  ["ESM", () => import("../../src/components/meal-estimate-editor.js")]
];
const { pickLang } = createI18n();
function ChoiceField() {
  return null;
}

function walk(node, visit) {
  if (node == null || typeof node === "boolean" || typeof node !== "object") return;
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

function elements(node, type) {
  const result = [];
  walk(node, value => {
    if (value.type === type) result.push(value);
  });
  return result;
}

function estimate() {
  return {
    status: "identified",
    dishName: "Rice and beans",
    overallConfidence: "medium",
    assumptions: ["120 g rice", "90 g beans"],
    items: [{
      id: "rice",
      name: "Rice",
      quantity: 120,
      unit: "g",
      estimatedGrams: 120,
      protein: 3,
      kcal: 156,
      carbs: 34,
      fat: 0.4,
      fiber: 0.5,
      salt: null,
      sugars: null,
      satfat: null,
      confidence: "medium"
    }]
  };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createMealEstimateEditor } = await load();
      let nextId = 0;
      const domain = createMealEstimate({ createItemId: () => `added-${++nextId}` });
      const { MealEstimateEditor } = createMealEstimateEditor({
        React,
        pickLang,
        createEmptyItem: domain.createEmptyItem,
        calculateTotals: domain.calculateTotals,
        ChoiceField
      });
      return callback(MealEstimateEditor);
    });
  });
}

contractTest("renders editable items, assumptions, confidence, and local totals", MealEstimateEditor => {
  const view = MealEstimateEditor({
    estimate: estimate(),
    lang: "en",
    isMobileView: false,
    disabled: false,
    errors: [],
    onChange: () => {}
  });
  const copy = textContent(view);
  assert.match(copy, /Dish name/);
  assert.match(copy, /Food 1/);
  assert.match(copy, /Protein: 3 g/);
  assert.match(copy, /Calories: 156 kcal/);
  assert.match(copy, /Estimate assumptions/);
});

contractTest("emits immutable drafts for dish, nutrient, assumption, add, and remove edits", MealEstimateEditor => {
  const original = estimate();
  const changes = [];
  const view = MealEstimateEditor({
    estimate: original,
    lang: "pt",
    isMobileView: false,
    disabled: false,
    errors: [],
    onChange: value => changes.push(value)
  });

  const inputs = elements(view, "input");
  inputs.find(input => input.props["data-estimate-field"] === "dishName")
    .props.onChange({ target: { value: "Arroz e feij\u00e3o" } });
  inputs.find(input => input.props["data-estimate-field"] === "protein")
    .props.onChange({ target: { value: "4.5" } });
  elements(view, "textarea")[0].props.onChange({ target: { value: "120 g arroz\n90 g feij\u00e3o" } });
  elements(view, "button").find(button => textContent(button) === "+ Adicionar alimento").props.onClick();
  elements(view, "button").find(button => textContent(button) === "Remover").props.onClick();

  assert.equal(changes[0].dishName, "Arroz e feij\u00e3o");
  assert.equal(changes[1].items[0].protein, "4.5");
  assert.deepEqual(changes[2].assumptions, ["120 g arroz", "90 g feij\u00e3o"]);
  assert.equal(changes[3].items.at(-1).id, "added-1");
  assert.deepEqual(changes[4].items, []);
  assert.equal(original.dishName, "Rice and beans");
  assert.equal(original.items[0].protein, 3);
});

contractTest("uses semantic ChoiceFields for overall and per-item confidence", MealEstimateEditor => {
  const changes = [];
  const view = MealEstimateEditor({
    estimate: estimate(),
    lang: "en",
    isMobileView: false,
    disabled: false,
    errors: [],
    onChange: value => changes.push(value)
  });
  const fields = elements(view, ChoiceField);
  const overall = fields.find(field => field.props.id === "estimate-overall-confidence");
  const item = fields.find(field => field.props.id === "estimate-item-confidence-rice");

  assert.deepEqual(overall.props.options.map(option => option.tone), ["high", "medium", "low"]);
  assert.equal(overall.props.options[1].description, "A quick review is recommended");
  overall.props.onChange("high");
  item.props.onChange("low");
  assert.equal(changes[0].overallConfidence, "high");
  assert.equal(changes[1].items[0].confidence, "low");
});

contractTest("blocks mutations and reports validation while disabled", MealEstimateEditor => {
  let changes = 0;
  const view = MealEstimateEditor({
    estimate: estimate(),
    lang: "es",
    isMobileView: true,
    disabled: true,
    errors: [{ path: "items.0.kcal", code: "required-number" }],
    onChange: () => { changes += 1; }
  });

  elements(view, "input")[0].props.onChange({ target: { value: "ignored" } });
  elements(view, "button")[0].props.onClick();
  assert.equal(changes, 0);
  assert.match(textContent(view), /Revisa los campos marcados/);
  elements(view, "input").forEach(input => assert.equal(input.props.disabled, true));
  elements(view, "button").forEach(button => assert.equal(button.props.disabled, true));
});

contractTest("returns null without controlled state or callback", MealEstimateEditor => {
  assert.equal(MealEstimateEditor({ estimate: null, onChange: () => {} }), null);
  assert.equal(MealEstimateEditor({ estimate: estimate(), onChange: null }), null);
});
