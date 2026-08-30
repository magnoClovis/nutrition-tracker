const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("../../vendor/react.production.min.js");
const { createI18n } = require("../../i18n.js");
const { createDateUtils } = require("../../date-utils.js");
const { createFoodEntry } = require("../../food-entry.js");
const implementations = [
  ["UMD", () => Promise.resolve(require("../../saved-meal-card.js"))],
  ["ESM", () => import("../../src/components/saved-meal-card.js")]
];

const { normalizeLanguage, pickLang, localeForLang } = createI18n();
const { divisor } = createDateUtils({ normalizeLanguage, pickLang, localeForLang });
const foodEntry = createFoodEntry({
  divisor,
  createEntryId: () => "entry-id",
  getEntryTime: () => "12:00",
  getPantry: () => [],
  buildDayTotals: log => (log.items || []).reduce((totals, item) => ({
    protein: totals.protein + Number(item.protein || 0),
    kcal: totals.kcal + Number(item.kcal || 0),
    carbs: totals.carbs + Number(item.carbs || 0),
    fat: totals.fat + Number(item.fat || 0),
    fiber: totals.fiber + Number(item.fiber || 0),
    salt: totals.salt + Number(item.salt || 0)
  }), { protein: 0, kcal: 0, carbs: 0, fat: 0, fiber: 0, salt: 0 })
});
function ChoiceField() {
  return null;
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

function buttons(node) {
  const result = [];
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (value.type === "button") result.push(value);
    React.Children.toArray(value.props && value.props.children).forEach(visit);
  }
  visit(node);
  return result;
}

function props(overrides = {}) {
  return {
    template: {
      id: "meal-1",
      name: "Modelo",
      meal: "Almo\u00e7o",
      items: [{
        foodId: "food-1", name: "Arroz", qty: 100, unit: "g",
        protein: 4, kcal: 130, carbs: 28, fat: 1
      }]
    },
    context: "add",
    goals: { protein: 100, kcal: 2000 },
    lang: "pt",
    expanded: false,
    isMobileView: false,
    isEditing: false,
    editDraft: null,
    mealOptions: ["Almo\u00e7o"],
    pantryFoods: [],
    getMealLabel: value => value,
    onToggleExpanded: () => {},
    onAppend: () => {},
    onEdit: () => {},
    onLoad: () => {},
    onDelete: () => {},
    onEditDraftChange: () => {},
    onUpdateItem: () => {},
    onRemoveItem: () => {},
    onAddItem: () => {},
    onCancelEdit: () => {},
    onSaveEdit: () => {},
    ...overrides
  };
}

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => {
      const { createSavedMealCard } = await load();
      const { SavedMealCard } = createSavedMealCard({
        React,
        pickLang,
        templateEntries: foodEntry.templateEntries,
        templateTotals: foodEntry.templateTotals,
        templateItemEntry: foodEntry.templateItemEntry,
        ChoiceField
      });
      return callback(SavedMealCard);
    });
  });
}

contractTest("renders add-context totals and delegates append/edit", SavedMealCard => {
  const calls = [];
  const card = SavedMealCard(props({
    onAppend: template => calls.push(["append", template.id]),
    onLoad: template => calls.push(["load", template.id])
  }));
  assert.match(textContent(card), /130 kcal \u00b7 7%/);
  assert.match(textContent(card), /4g prote\u00edna \u00b7 4%/);
  const actions = buttons(card);
  actions.find(button => textContent(button) === "Adicionar").props.onClick();
  actions.find(button => textContent(button) === "Editar").props.onClick();
  assert.deepEqual(calls, [["append", "meal-1"], ["load", "meal-1"]]);
});

contractTest("renders empty expanded templates and pantry delete action", SavedMealCard => {
  let deleted;
  const card = SavedMealCard(props({
    template: { id: "empty", name: "Vazio", meal: "Almo\u00e7o", items: [] },
    context: "pantry",
    expanded: true,
    onDelete: id => { deleted = id; }
  }));
  assert.match(textContent(card), /Sem ingredientes salvos\./);
  buttons(card).find(button => button.props.title === "Apagar").props.onClick();
  assert.equal(deleted, "empty");
});

contractTest("renders the inline edit form and delegates draft/item actions", SavedMealCard => {
  const calls = [];
  const editDraft = {
    name: "Modelo",
    meal: "Almo\u00e7o",
    items: [{ foodId: "food-1", name: "Arroz", qty: 50, unit: "g", kcal: 65, protein: 2 }],
    addFoodId: "food-2",
    addQty: "20"
  };
  const card = SavedMealCard(props({
    context: "pantry",
    isEditing: true,
    editDraft,
    pantryFoods: [{ id: "food-2", name: "Feij\u00e3o" }],
    onAddItem: () => calls.push("add"),
    onCancelEdit: () => calls.push("cancel"),
    onSaveEdit: () => calls.push("save")
  }));
  assert.match(textContent(card), /Salvar altera\u00e7\u00f5es/);
  const actions = buttons(card);
  actions.find(button => textContent(button) === "Adicionar").props.onClick();
  actions.find(button => textContent(button) === "Cancelar").props.onClick();
  actions.find(button => textContent(button) === "Salvar altera\u00e7\u00f5es").props.onClick();
  assert.deepEqual(calls, ["add", "cancel", "save"]);
});

contractTest("uses the reusable ChoiceField for the saved meal default", SavedMealCard => {
  const editDraft = {
    name: "Modelo",
    meal: "Almoço",
    items: [{ foodId: "food-1", name: "Arroz", qty: 50 }],
    addFoodId: "",
    addQty: ""
  };
  let nextDraft = null;
  const card = SavedMealCard(props({
    context: "pantry",
    isEditing: true,
    editDraft,
    mealOptions: ["Almoço", "Jantar"],
    onEditDraftChange: updater => { nextDraft = updater(editDraft); }
  }));
  const fields = [];
  (function visit(value) {
    if (!value || typeof value !== "object") return;
    if (value.type === ChoiceField) fields.push(value);
    React.Children.toArray(value.props && value.props.children).forEach(visit);
  })(card);

  assert.equal(fields[0].props.id, "saved-meal-default-meal-1");
  fields[0].props.onChange("Jantar");
  assert.equal(nextDraft.meal, "Jantar");
});
