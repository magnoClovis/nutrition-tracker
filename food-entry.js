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

    function buildEntry(food, qty) {
      return buildEntryFromSnapshot(buildFoodSnapshot(food), qty);
    }

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

    function templateEntries(tmpl) {
      return (tmpl.items || []).map(templateItemEntry);
    }

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
