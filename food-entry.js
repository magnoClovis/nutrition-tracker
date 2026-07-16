/**
 * Food and diary-entry transformation helpers.
 *
 * The UMD module exposes a `createFoodEntry` factory. The factory receives all
 * environment-dependent behavior explicitly (`divisor`, ID and local-time
 * providers, pantry access, and day-total calculation) and returns the field
 * descriptors plus helpers that transform food records, snapshots, diary
 * entries, and meal templates. Inputs are plain objects and outputs are new
 * plain objects or arrays; pantry lookup and total calculation are delegated to
 * the injected dependencies.
 *
 * @module FoodEntry
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FoodEntry = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const MACRO_FIELDS_BASE = [{
    key: "protein100",
    labelKey: "protein",
    unit: "g",
    color: "#c8a96e",
    required: true
  }, {
    key: "kcal100",
    labelKey: "calories",
    unit: "kcal",
    color: "#8ec8c8",
    required: true
  }, {
    key: "carbs100",
    labelKey: "carbs",
    unit: "g",
    color: "#a96ec8",
    required: false
  }, {
    key: "sugars100",
    labelKey: "sugars",
    unit: "g",
    color: "#a96ec8",
    required: false,
    sub: true,
    group: "carbs"
  }, {
    key: "fat100",
    labelKey: "fat",
    unit: "g",
    color: "#c86e8e",
    required: false
  }, {
    key: "satfat100",
    labelKey: "satfat",
    unit: "g",
    color: "#c86e8e",
    required: false,
    sub: true,
    group: "fat"
  }, {
    key: "fiber100",
    labelKey: "fiber",
    unit: "g",
    color: "#3a9a7a",
    required: false
  }, {
    key: "salt100",
    labelKey: "salt",
    unit: "g",
    color: "var(--muted2)",
    required: false
  }];

  const MICRO_FIELDS_BASE = [{
    key: "b12_100",
    labelKey: "vitB12",
    unit: "µg"
  }, {
    key: "niacin100",
    labelKey: "niacin",
    unit: "mg"
  }, {
    key: "phosphorus100",
    labelKey: "phosphorus",
    unit: "mg"
  }, {
    key: "vitd100",
    labelKey: "vitD",
    unit: "µg"
  }, {
    key: "calcium100",
    labelKey: "calcium",
    unit: "mg"
  }, {
    key: "iron100",
    labelKey: "iron",
    unit: "mg"
  }, {
    key: "potassium100",
    labelKey: "potassium",
    unit: "mg"
  }, {
    key: "magnesium100",
    labelKey: "magnesium",
    unit: "mg"
  }, {
    key: "zinc100",
    labelKey: "zinc",
    unit: "mg"
  }, {
    key: "vitc100",
    labelKey: "vitC",
    unit: "mg"
  }];

  const ALL_FIELDS_KEYS = [...MACRO_FIELDS_BASE, ...MICRO_FIELDS_BASE];

  /**
   * Creates the food-entry API with its runtime dependencies supplied by the
   * host application.
   *
   * @param {Object} dependencies Injected runtime dependencies.
   * @param {function(string): number} dependencies.divisor Returns the quantity divisor for a unit.
   * @param {function(): string} dependencies.createEntryId Creates a diary-entry ID.
   * @param {function(): string} dependencies.getEntryTime Returns the entry time string.
   * @param {function(): Array<Object>} dependencies.getPantry Returns the current pantry foods.
   * @param {function(Object): Object} dependencies.buildDayTotals Calculates totals for an items collection.
   * @returns {Object} Field descriptors and food, entry, and template transformation helpers.
   */
  function createFoodEntry({ divisor, createEntryId, getEntryTime, getPantry, buildDayTotals }) {
    if (
      typeof divisor !== "function" ||
      typeof createEntryId !== "function" ||
      typeof getEntryTime !== "function" ||
      typeof getPantry !== "function" ||
      typeof buildDayTotals !== "function"
    ) {
      throw new TypeError("FoodEntry requires divisor, createEntryId, getEntryTime, getPantry, and buildDayTotals functions");
    }

    /**
     * Builds the initial editable food state with every nutrient field empty.
     *
     * @returns {Object} A new empty food object.
     */
    function emptyFood() {
      const f = {
        name: "",
        unit: "g",
        portionSize: "100",
        unitWeightG: ""
      };
      ALL_FIELDS_KEYS.forEach(ff => {
        f[ff.key] = "";
      });
      return f;
    }

    /**
     * Copies the stable food identity and nutrient values into an entry snapshot.
     *
     * @param {Object} food Pantry or form food data.
     * @returns {Object} A new food snapshot with missing nutrient values normalized to `null`.
     */
    function buildFoodSnapshot(food) {
      const snap = {
        id: food.id || null,
        name: food.name,
        unit: food.unit
      };
      ALL_FIELDS_KEYS.forEach(f => {
        snap[f.key] = food[f.key] != null ? food[f.key] : null;
      });
      return snap;
    }

    /**
     * Builds a diary entry and scales its nutrients from a food snapshot.
     *
     * @param {Object} snapshot Food data captured for the diary entry.
     * @param {number} qty Entry quantity in the snapshot unit.
     * @returns {Object} A new diary entry with generated identity, time, and scaled nutrients.
     */
    function buildEntryFromSnapshot(snapshot, qty) {
      const e = {
        id: createEntryId(),
        foodId: snapshot.id || null,
        name: snapshot.name,
        qty,
        unit: snapshot.unit,
        foodSnapshot: {
          ...snapshot
        }
      };
      const div = divisor(snapshot.unit);
      ALL_FIELDS_KEYS.forEach(f => {
        e[f.key.replace("100", "")] = snapshot[f.key] != null ? snapshot[f.key] * qty / div : null;
      });
      e.time = getEntryTime();
      return e;
    }

    /**
     * Builds a diary entry directly from a pantry or form food object.
     *
     * @param {Object} food Pantry or form food data.
     * @param {number} qty Entry quantity in the food unit.
     * @returns {Object} A new diary entry containing a food snapshot.
     */
    function buildEntry(food, qty) {
      return buildEntryFromSnapshot(buildFoodSnapshot(food), qty);
    }

    /**
     * Recalculates an entry for a replacement quantity.
     *
     * @param {Object} entry Existing diary entry.
     * @param {number} qty Replacement quantity.
     * @returns {Object} A new entry with recalculated nutrient values.
     */
    function recalcEntryQuantity(entry, qty) {
      if (entry.foodSnapshot) {
        const ne = buildEntryFromSnapshot(entry.foodSnapshot, qty);
        return {
          ...ne,
          id: entry.id,
          time: entry.time || ne.time
        };
      }
      const ratio = entry.qty ? qty / entry.qty : 1;
      const upd = {
        ...entry,
        qty
      };
      ALL_FIELDS_KEYS.forEach(f => {
        const k = f.key.replace("100", "");
        if (entry[k] != null) upd[k] = entry[k] * ratio;
      });
      return upd;
    }

    /**
     * Converts one meal-template item into a diary-entry-shaped object.
     *
     * @param {Object} item Meal-template item.
     * @returns {Object} A new diary entry or entry-shaped fallback for the item.
     */
    function templateItemEntry(item) {
      const qty = Number(item.qty) || 0;
      if (item.foodSnapshot) return buildEntryFromSnapshot(item.foodSnapshot, qty);
      if (item.kcal != null || item.protein != null) {
        return {
          ...item,
          id: item.foodId || item.name,
          qty,
          protein: item.protein || 0,
          kcal: item.kcal || 0,
          carbs: item.carbs || 0,
          fat: item.fat || 0,
          fiber: item.fiber || 0,
          salt: item.salt || 0
        };
      }
      const pantry = getPantry();
      const food = pantry.find(f => f.id === item.foodId || f.name === item.name);
      return food ? buildEntry(food, qty) : {
        ...item,
        id: item.foodId || item.name,
        qty,
        protein: 0,
        kcal: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        salt: 0
      };
    }

    /**
     * Converts all items in a meal template into diary entries.
     *
     * @param {Object} tmpl Meal template containing an optional `items` array.
     * @returns {Array<Object>} Newly built diary entries for the template items.
     */
    function templateEntries(tmpl) {
      return (tmpl.items || []).map(templateItemEntry);
    }

    /**
     * Calculates nutritional totals for a meal template.
     *
     * @param {Object} tmpl Meal template containing an optional `items` array.
     * @returns {Object} Totals returned by the injected day-total calculator.
     */
    function templateTotals(tmpl) {
      return buildDayTotals({items: templateEntries(tmpl)});
    }

    return {
      MACRO_FIELDS_BASE,
      MICRO_FIELDS_BASE,
      ALL_FIELDS_KEYS,
      emptyFood,
      buildFoodSnapshot,
      buildEntryFromSnapshot,
      buildEntry,
      recalcEntryQuantity,
      templateItemEntry,
      templateEntries,
      templateTotals
    };
  }

  return { createFoodEntry };
});
