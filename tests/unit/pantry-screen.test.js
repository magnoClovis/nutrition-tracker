const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const { createDateUtils } = require("../../date-utils.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../pantry-screen.js"))],
  ["ESM", () => import("../../src/components/pantry-screen.js")]
];

const { pickLang, normalizeLanguage, localeForLang } = createI18n();
const { portionLabel } = createDateUtils({ normalizeLanguage, pickLang, localeForLang });

const labels = {
  pantrySearch: "Search pantry",
  foodName: "Food name",
  foodNamePh: "Enter food",
  unit: "Unit",
  macros: "Macros",
  hideMicro: "Hide micros",
  showMicro: "Show micros",
  savePantry: "Save food",
  pantryTitle: "Pantry",
  noResults: "No results",
  pantryEmpty: "Pantry empty",
  editItem: "Edit",
  pantrySave: "Save",
  suppNameLabel: "Name",
  suppPantryTitle: "Supplements",
  suppDoseLabel: "Dose",
  suppSave: "Save supplement",
  defaultDose: "Default dose"
};
const text = key => labels[key] || key;

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

const noOp = () => {};
const macroFields = [
  { key: "protein100", label: "Protein", unit: "g", required: true },
  { key: "kcal100", label: "Calories", unit: "kcal", required: true }
];

function baseProps(overrides = {}) {
  return {
    lang: "en",
    isMobileView: false,
    text,
    form: {
      name: "",
      unit: "g",
      unitWeightG: "",
      portionSize: "100",
      protein100: "",
      kcal100: ""
    },
    setForm: noOp,
    showMicroForm: false,
    setShowMicroForm: noOp,
    editingId: null,
    setEditingId: noOp,
    editForm: null,
    setEditForm: noOp,
    autoFillLoading: false,
    foodDbLoading: false,
    foodDbResults: [],
    barcodeModalOpen: false,
    setBarcodeModalOpen: noOp,
    barcodeInput: "",
    setBarcodeInput: noOp,
    barcodeLoading: false,
    barcodeScanning: false,
    barcodeMessage: "",
    setBarcodeMessage: noOp,
    scannerVideoElement: React.createElement("video", { "data-test-video": true }),
    closeBarcodeModal: noOp,
    startBarcodeScanner: noOp,
    stopBarcodeScanner: noOp,
    fetchBarcodeProduct: noOp,
    searchFoodDatabase: noOp,
    autoFillNutrition: noOp,
    pantrySearch: "",
    setPantrySearch: noOp,
    pantryItemsOpen: true,
    setPantryItemsOpen: noOp,
    mealTemplatesOpen: false,
    setMealTemplatesOpen: noOp,
    newFoodOpen: false,
    setNewFoodOpen: noOp,
    expandedTemplateIds: {},
    expandedPantryIds: {},
    setExpandedPantryIds: noOp,
    suppPantryOpen: false,
    setSuppPantryOpen: noOp,
    pantry: [],
    filteredPantry: [],
    sortedPantry: [],
    sortedAllPantry: [],
    mealTemplates: [],
    suppPantry: [],
    suppForm: { name: "", dose: "", unit: "un", notes: "" },
    setSuppForm: noOp,
    showSuppForm: false,
    setShowSuppForm: noOp,
    weightForm: { bodyFatPct: "", waistCm: "", muscleMassKg: "" },
    setWeightForm: noOp,
    bodyComposition: { currentFatPct: null, latest: null },
    macroFieldsOrdered: macroFields,
    macroFields,
    microFields: [],
    allFields: macroFields,
    addFood: noOp,
    startEdit: noOp,
    saveEdit: noOp,
    removeFood: noOp,
    addSuppToPantry: noOp,
    removeSuppPantry: noOp,
    SavedMealCard,
    goals: { protein: 100, kcal: 2000 },
    editingTemplateId: null,
    templateEditDraft: null,
    mealOptions: ["Caf\u00e9 da manh\u00e3"],
    getMealLabel: value => value,
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
    ...overrides
  };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createPantryScreen } = await load();
      const { PantryScreen } = createPantryScreen({ React, pickLang, portionLabel });
      return callback(PantryScreen);
    });
  });
}

contractTest("renders empty and populated pantry states", PantryScreen => {
  const empty = PantryScreen(baseProps());
  assert.match(textContent(empty), /Pantry empty/);

  const food = {
    id: "food-1",
    name: "Oats",
    unit: "g",
    protein100: 13,
    kcal100: 389
  };
  const populated = PantryScreen(baseProps({
    pantry: [food],
    filteredPantry: [food],
    sortedPantry: [food],
    sortedAllPantry: [food]
  }));
  assert.match(textContent(populated), /Oats/);
  assert.match(textContent(populated), /13g protein/);
});

contractTest("preserves search result and no-result presentation", PantryScreen => {
  const withoutFoodDbResults = PantryScreen(baseProps({
    pantrySearch: "missing",
    foodDbResults: []
  }));
  const withFoodDbResults = PantryScreen(baseProps({
    pantrySearch: "missing",
    foodDbResults: [{ code: "unused-result" }]
  }));
  assert.match(textContent(withoutFoodDbResults), /No results/);
  assert.equal(textContent(withFoodDbResults), textContent(withoutFoodDbResults));
  assert.doesNotMatch(textContent(withFoodDbResults), /unused-result/);
});

contractTest("passes template edit state and callbacks to SavedMealCard", PantryScreen => {
  const editDraft = { name: "Edited meal", items: [] };
  const template = { id: "template-1", name: "Lunch", items: [] };
  const saveTemplateEdit = () => {};
  const view = PantryScreen(baseProps({
    mealTemplatesOpen: true,
    mealTemplates: [template],
    editingTemplateId: "template-1",
    templateEditDraft: editDraft,
    saveTemplateEdit
  }));
  const cards = findNodes(view, node => node.type === SavedMealCard);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].props.context, "pantry");
  assert.equal(cards[0].props.isEditing, true);
  assert.equal(cards[0].props.editDraft, editDraft);
  assert.equal(cards[0].props.onSaveEdit, saveTemplateEdit);
});

contractTest("delegates scanner controls and places the controller-owned video element", PantryScreen => {
  const calls = [];
  const scannerVideoElement = React.createElement("video", { "data-controller-video": true });
  const closeBarcodeModal = () => {
    calls.push(["close"]);
  };
  const view = PantryScreen(baseProps({
    newFoodOpen: true,
    barcodeModalOpen: true,
    scannerVideoElement,
    setBarcodeModalOpen(value) {
      calls.push(["open", value]);
    },
    setBarcodeMessage(value) {
      calls.push(["message", value]);
    },
    closeBarcodeModal,
    startBarcodeScanner() {
      calls.push(["start"]);
    },
    fetchBarcodeProduct() {
      calls.push(["lookup"]);
    }
  }));

  const buttons = findNodes(view, node => node.type === "button");
  buttons.find(node => node.props["data-tutorial"] === "barcode-scan-button").props.onClick();
  buttons.find(node => textContent(node) === "Use camera").props.onClick();
  buttons.find(node => textContent(node) === "Search").props.onClick();
  buttons.find(node => node.props.onClick === closeBarcodeModal).props.onClick();

  assert.deepEqual(calls, [["open", true], ["message", ""], ["start"], ["lookup"], ["close"]]);
  assert.equal(findNodes(view, node => node.props && node.props["data-controller-video"]).length, 1);
});

contractTest("preserves the hidden required supplement dose and orphan body-composition block", PantryScreen => {
  const view = PantryScreen(baseProps({
    suppPantryOpen: true,
    showSuppForm: true
  }));
  const hiddenBlocks = findNodes(view, node => node.props && node.props.style
    && node.props.style.display === "none");
  assert.equal(hiddenBlocks.some(node => /Dose/.test(textContent(node))), true);
  assert.equal(hiddenBlocks.some(node => /Body fat/.test(textContent(node))), true);
});
