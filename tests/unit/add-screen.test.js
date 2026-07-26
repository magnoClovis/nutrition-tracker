const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const { createDateUtils } = require("../../date-utils.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../add-screen.js"))],
  ["ESM", () => import("../../src/components/add-screen.js")]
];

const { pickLang, normalizeLanguage, localeForLang } = createI18n();
const { quickQtys, divisor } = createDateUtils({
  normalizeLanguage,
  pickLang,
  localeForLang
});
const labels = {
  repeatRecent: "Recent meals",
  today: "Today",
  modeBatch: "Build meal",
  modeDescribe: "Describe dish",
  describeDish: "Describe dish",
  estimating: "Estimating",
  searchFood: "Search food",
  qty: "Quantity",
  logToDiary: "Log to diary",
  pantryEmpty: "Pantry empty"
};
const text = key => labels[key] || key;
const noOp = () => {};

function visit(node, callback) {
  if (!node || typeof node !== "object") return;
  callback(node);
  React.Children.toArray(node.props && node.props.children).forEach(child => visit(child, callback));
}

function findNodes(node, predicate) {
  const result = [];
  visit(node, value => {
    if (predicate(value)) result.push(value);
  });
  return result;
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

function SavedMealCard() {
  return null;
}

function baseProps(overrides = {}) {
  const food = {
    id: "food-1",
    name: "Oats",
    unit: "g",
    protein100: 13,
    kcal100: 389,
    carbs100: 66,
    fat100: 7
  };
  return {
    section: "content",
    lang: "en",
    isMobileView: false,
    text,
    openTab: noOp,
    showRecentMeals: false,
    setShowRecentMeals: noOp,
    recentMeals: [],
    MEALS: ["Café da manhã", "Almoço"],
    mealDisplay: value => value,
    loadRecentMealToStaged: noOp,
    TODAY: "2026-07-23",
    showSaveTemplateModal: false,
    setShowSaveTemplateModal: noOp,
    staged: {
      meal: "Café da manhã",
      items: [{
        id: "entry-1",
        foodId: food.id,
        name: food.name,
        qty: 100,
        unit: "g",
        protein: 13,
        kcal: 389,
        carbs: 66,
        fat: 7
      }]
    },
    templateName: "",
    setTemplateName: noOp,
    saveTemplate: noOp,
    addTemplatesOpen: false,
    describeMode: false,
    pantry: [food],
    selectAddMode: noOp,
    mealTemplates: [],
    addTemplateSearch: "",
    setAddTemplateSearch: noOp,
    SavedMealCard,
    goals: { protein: 120, kcal: 2200 },
    expandedTemplateIds: {},
    editingTemplateId: null,
    templateEditDraft: null,
    sortedAllPantry: [food],
    mealLabel: value => value,
    toggleTemplateExpanded: noOp,
    appendTemplateToStaged: noOp,
    beginTemplateEdit: noOp,
    loadTemplate: noOp,
    deleteTemplate: noOp,
    setTemplateEditDraft: noOp,
    updateTemplateDraftItem: noOp,
    removeTemplateDraftItem: noOp,
    addTemplateDraftItem: noOp,
    cancelTemplateEdit: noOp,
    saveTemplateEdit: noOp,
    describeMeal: "Almoço",
    setDescribeMeal: noOp,
    mealDescription: "",
    setMealDescription: noOp,
    describeLoading: false,
    estimateMealDescription: noOp,
    describeResult: null,
    addDescribedToLog: noOp,
    evaluateDescribedMeal: noOp,
    batchMode: true,
    addEntry: { foodId: food.id, qty: "100", meal: "Café da manhã" },
    setAddEntry: noOp,
    selectedFood: food,
    ALL_FIELDS: [
      { key: "protein100", label: "Protein", unit: "g" },
      { key: "kcal100", label: "Calories", unit: "kcal" },
      { key: "carbs100", label: "Carbs", unit: "g" }
    ],
    addToLog: noOp,
    addToStaged: noOp,
    setStaged: noOp,
    editStagedIdx: null,
    editStagedQty: "",
    setEditStagedQty: noOp,
    saveEditStaged: noOp,
    setEditStagedIdx: noOp,
    removeFromStaged: noOp,
    stagedTot: { protein: 13, kcal: 389, carbs: 66 },
    commitStaged: noOp,
    evaluateStagedMeal: noOp,
    openSaveTemplateModal: noOp,
    legacyTransferPanel: React.createElement("div", { "data-legacy-transfer": true }),
    ...overrides
  };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createAddScreen } = await load();
      const { AddScreen } = createAddScreen({ React, pickLang, quickQtys, divisor });
      return callback(AddScreen);
    });
  });
}

contractTest("renders staged meal assembly and invokes its controlled callbacks", AddScreen => {
  let committed = 0;
  let evaluated = 0;
  let removed = null;
  const view = AddScreen(baseProps({
    commitStaged: () => { committed += 1; },
    evaluateStagedMeal: () => { evaluated += 1; },
    removeFromStaged: index => { removed = index; }
  }));

  assert.match(textContent(view), /Oats/);
  assert.match(textContent(view), /13g prot/);
  assert.match(textContent(view), /389 kcal/);

  const buttons = findNodes(view, node => node.type === "button");
  const logButton = buttons.find(node => /Log meal/.test(textContent(node)));
  const reviewButton = buttons.find(node => /Evaluate meal/.test(textContent(node)));
  const removeButton = buttons.find(node => textContent(node) === "×");
  logButton.props.onClick();
  reviewButton.props.onClick();
  removeButton.props.onClick();
  assert.equal(committed, 1);
  assert.equal(evaluated, 1);
  assert.equal(removed, 0);
});

contractTest("passes saved-template state and loading callback to SavedMealCard", AddScreen => {
  const template = { id: "template-1", name: "Workout meal", items: [] };
  let loaded = null;
  const view = AddScreen(baseProps({
    addTemplatesOpen: true,
    mealTemplates: [template],
    loadTemplate: value => { loaded = value; }
  }));
  const cards = findNodes(view, node => node.type === SavedMealCard);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].props.context, "add");
  assert.equal(cards[0].props.template, template);
  cards[0].props.onLoad(template);
  assert.equal(loaded, template);
});

contractTest("renders dish-description loading/result states and delegates actions", AddScreen => {
  let estimated = 0;
  let registered = 0;
  let reviewed = 0;
  const loading = AddScreen(baseProps({
    describeMode: true,
    describeLoading: true,
    estimateMealDescription: () => { estimated += 1; }
  }));
  assert.match(textContent(loading), /Estimating/);
  const estimateButton = findNodes(loading, node => node.type === "button")
    .find(node => /Estimating/.test(textContent(node)));
  estimateButton.props.onClick();
  assert.equal(estimated, 1);

  const result = AddScreen(baseProps({
    describeMode: true,
    mealDescription: "Rice and beans",
    describeResult: {
      name: "Estimated plate",
      protein: 25,
      kcal: 540,
      carbs: 70,
      fat: 12,
      fiber: 8,
      salt: 1.2,
      confidence: "high",
      note: "Approximate"
    },
    addDescribedToLog: () => { registered += 1; },
    evaluateDescribedMeal: () => { reviewed += 1; }
  }));
  assert.match(textContent(result), /Estimated plate/);
  const resultButtons = findNodes(result, node => node.type === "button");
  resultButtons.find(node => node.props.onClick && /Log meal/.test(textContent(node))).props.onClick();
  resultButtons.find(node => node.props.onClick && /Evaluate meal/.test(textContent(node))).props.onClick();
  assert.equal(registered, 1);
  assert.equal(reviewed, 1);

  const neutralAfterError = AddScreen(baseProps({
    describeMode: true,
    describeLoading: false,
    describeResult: null
  }));
  assert.doesNotMatch(textContent(neutralAfterError), /Estimated plate|Approximate/);
});

contractTest("keeps active GA absent and places the legacy transfer panel as an opaque node", AddScreen => {
  function GaResultCard() {
    return React.createElement("div", null, "active-ga-result");
  }
  const legacyNode = React.createElement("div", { "data-legacy-transfer": true }, "legacy-only");
  const view = AddScreen(baseProps({
    legacyTransferPanel: legacyNode,
    GaResultCard,
    gaResult: { items: [{ name: "Should not render" }] }
  }));
  const legacy = findNodes(view, node => node.props && node.props["data-legacy-transfer"]);
  assert.equal(legacy.length, 1);
  assert.equal(textContent(legacy[0]), "legacy-only");
  assert.doesNotMatch(textContent(view), /active-ga-result|Should not render/);
});

contractTest("recent meals and header remain controlled sections", AddScreen => {
  let toggled = 0;
  let loaded = null;
  let closed = 0;
  const recentMeal = {
    meal: "Café da manhã",
    date: "2026-07-23",
    entries: [{ name: "Oats" }],
    protein: 13,
    kcal: 389
  };
  const recent = AddScreen(baseProps({
    section: "recent",
    showRecentMeals: true,
    recentMeals: [recentMeal],
    setShowRecentMeals: () => { toggled += 1; },
    loadRecentMealToStaged: value => { loaded = value; }
  }));
  findNodes(recent, node => node.type === "button")[0].props.onClick();
  const recentRow = findNodes(recent, node => typeof node.props?.onClick === "function")
    .find(node => /Oats/.test(textContent(node)));
  recentRow.props.onClick();
  assert.equal(toggled, 1);
  assert.equal(loaded, recentMeal);

  const header = AddScreen(baseProps({
    section: "header",
    openTab: value => {
      if (value === "diario") closed += 1;
    }
  }));
  findNodes(header, node => node.type === "button")[0].props.onClick();
  assert.equal(closed, 1);
});
