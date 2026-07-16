const test = require("node:test");
const assert = require("node:assert/strict");
const { createDateUtils } = require("../../date-utils.js");
const { createFoodEntry } = require("../../food-entry.js");

function normalizeLanguage(lang) {
  return lang === "en" || lang === "es" ? lang : "pt";
}

function pickLang(lang, pt, en, es) {
  const normalized = normalizeLanguage(lang);
  return normalized === "en" ? en : normalized === "es" ? es : pt;
}

function localeForLang(lang) {
  const normalized = normalizeLanguage(lang);
  return normalized === "en" ? "en-US" : normalized === "es" ? "es-ES" : "pt-BR";
}

const { divisor, rnd } = createDateUtils({ normalizeLanguage, pickLang, localeForLang });
let pantry = [];
let nextId = 0;

function buildDayTotals(log) {
  const entries = Object.values(log).flat();
  return {
    protein: rnd(entries.reduce((sum, entry) => sum + (entry.protein ?? 0), 0)),
    kcal: rnd(entries.reduce((sum, entry) => sum + (entry.kcal ?? 0), 0)),
    carbs: rnd(entries.reduce((sum, entry) => sum + (entry.carbs ?? 0), 0)),
    fat: rnd(entries.reduce((sum, entry) => sum + (entry.fat ?? 0), 0)),
    fiber: rnd(entries.reduce((sum, entry) => sum + (entry.fiber ?? 0), 0)),
    salt: rnd(entries.reduce((sum, entry) => sum + (entry.salt ?? 0), 0))
  };
}

const foodEntry = createFoodEntry({
  divisor,
  createEntryId: () => `entry-${++nextId}`,
  getEntryTime: () => "12:34",
  getPantry: () => pantry,
  buildDayTotals
});

const {
  ALL_FIELDS_KEYS,
  emptyFood,
  buildFoodSnapshot,
  buildEntryFromSnapshot,
  buildEntry,
  recalcEntryQuantity,
  templateEntries,
  templateTotals
} = foodEntry;

function completeFood(overrides = {}) {
  const food = {
    id: "food-complete",
    name: "Complete food",
    unit: "g",
    ...overrides
  };
  ALL_FIELDS_KEYS.forEach((field, index) => {
    if (!Object.prototype.hasOwnProperty.call(food, field.key)) food[field.key] = index + 1;
  });
  return food;
}

test("creates a valid empty food state for every field", () => {
  const food = emptyFood();
  assert.equal(food.name, "");
  assert.equal(food.unit, "g");
  assert.equal(food.portionSize, "100");
  assert.equal(food.unitWeightG, "");
  assert.equal(ALL_FIELDS_KEYS.length, 18);
  ALL_FIELDS_KEYS.forEach(field => assert.equal(food[field.key], ""));
});

test("builds complete and null-safe food snapshots", () => {
  const source = completeFood({ protein100: 12.5, salt100: null, extra: "ignored" });
  const snapshot = buildFoodSnapshot(source);
  assert.equal(snapshot.id, "food-complete");
  assert.equal(snapshot.name, "Complete food");
  assert.equal(snapshot.unit, "g");
  assert.equal(snapshot.protein100, 12.5);
  assert.equal(snapshot.salt100, null);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot, "extra"), false);

  const sparse = buildFoodSnapshot({ name: "Sparse", unit: "ml", protein100: undefined, kcal100: null });
  assert.equal(sparse.id, null);
  ALL_FIELDS_KEYS.forEach(field => assert.equal(sparse[field.key], null));
});

test("builds entries from complete and sparse snapshots", () => {
  const complete = buildFoodSnapshot(completeFood({ protein100: 10, kcal100: 120, salt100: null }));
  const entry = buildEntryFromSnapshot(complete, 200);
  assert.match(entry.id, /^entry-/);
  assert.equal(entry.foodId, "food-complete");
  assert.equal(entry.qty, 200);
  assert.equal(entry.protein, 20);
  assert.equal(entry.kcal, 240);
  assert.equal(entry.salt, null);
  assert.equal(entry.time, "12:34");
  assert.deepEqual(entry.foodSnapshot, complete);

  const sparse = buildEntryFromSnapshot(buildFoodSnapshot({ name: "Sparse", unit: "g" }), 75);
  assert.equal(sparse.foodId, null);
  assert.equal(sparse.protein, null);
  assert.equal(sparse.kcal, null);
});

test("recalculates snapshot entries for doubled, zero, and fractional quantities", () => {
  const original = buildEntry(completeFood({ protein100: 10, kcal100: 100 }), 100);
  const doubled = recalcEntryQuantity(original, 200);
  assert.equal(doubled.id, original.id);
  assert.equal(doubled.time, original.time);
  assert.equal(doubled.protein, 20);
  assert.equal(doubled.kcal, 200);

  const zero = recalcEntryQuantity(original, 0);
  assert.equal(zero.protein, 0);
  assert.equal(zero.kcal, 0);

  const fractional = recalcEntryQuantity(original, 12.5);
  assert.equal(fractional.protein, 1.25);
  assert.equal(fractional.kcal, 12.5);
});

test("preserves legacy ratio behavior without a food snapshot", () => {
  const legacy = {id: "legacy", qty: 50, protein: 5, kcal: 60, carbs: null};
  const doubled = recalcEntryQuantity(legacy, 100);
  assert.equal(doubled.protein, 10);
  assert.equal(doubled.kcal, 120);
  assert.equal(doubled.carbs, null);

  const zero = recalcEntryQuantity(legacy, 0);
  assert.equal(zero.protein, 0);
  assert.equal(zero.kcal, 0);
});

test("builds and totals templates with snapshot, legacy, pantry, and missing items", () => {
  pantry = [completeFood({
    id: "pantry-food",
    name: "Pantry food",
    protein100: 20,
    kcal100: 100,
    carbs100: 10,
    fat100: 4,
    fiber100: 2,
    salt100: 0.5
  })];
  const snapshot = buildFoodSnapshot(completeFood({
    id: "snapshot-food",
    name: "Snapshot food",
    protein100: 5,
    kcal100: 80,
    carbs100: 6,
    fat100: 2,
    fiber100: 1,
    salt100: 0.2
  }));
  const template = {
    items: [
      {name: "Snapshot food", qty: 200, foodSnapshot: snapshot},
      {name: "Legacy", qty: "2", protein: 3, kcal: 40, carbs: 1, fat: 2, fiber: 0.5, salt: 0.1},
      {name: "Pantry food", foodId: "pantry-food", qty: 50},
      {name: "Missing", foodId: "missing", qty: 25}
    ]
  };

  const entries = templateEntries(template);
  assert.equal(entries.length, 4);
  assert.equal(entries[0].protein, 10);
  assert.equal(entries[1].id, "Legacy");
  assert.equal(entries[1].qty, 2);
  assert.equal(entries[2].protein, 10);
  assert.equal(entries[2].kcal, 50);
  assert.equal(entries[3].protein, 0);
  assert.equal(entries[3].kcal, 0);

  assert.deepEqual(templateTotals(template), {
    protein: 23,
    kcal: 250,
    carbs: 18,
    fat: 8,
    fiber: 3.5,
    salt: 0.8
  });
});
