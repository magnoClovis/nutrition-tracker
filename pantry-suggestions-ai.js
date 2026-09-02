/**
 * Structured AI suggestions constrained to the user's current pantry.
 *
 * Provider output is treated as untrusted even after Worker validation. This
 * module resolves every returned ID against the exact request snapshot and
 * recalculates nutrient totals locally before the suggestion can reach UI or
 * diary state.
 *
 * @module PantrySuggestionsAI
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PantrySuggestionsAI = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const CONTRACT_VERSION = "pantry-suggestions-v2";
  const NUTRIENT_FIELDS = Object.freeze([
    "protein100", "kcal100", "carbs100", "sugars100",
    "fat100", "satfat100", "fiber100", "salt100"
  ]);
  const RESULT_NUTRIENTS = Object.freeze([
    ["protein100", "protein"],
    ["kcal100", "kcal"],
    ["carbs100", "carbs"],
    ["sugars100", "sugars"],
    ["fat100", "fat"],
    ["satfat100", "satfat"],
    ["fiber100", "fiber"],
    ["salt100", "salt"]
  ]);
  const VALID_UNITS = new Set(["g", "ml", "un"]);
  const VALID_LANGUAGES = new Set(["pt", "en", "es"]);
  const MAX_PANTRY_ITEMS = 200;
  const MAX_SUGGESTIONS = 3;
  const MAX_ITEMS_PER_SUGGESTION = 8;
  const MAX_QUANTITY = 10_000;

  function exactKeys(value, keys) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const actual = Object.keys(value);
    return actual.length === keys.length && keys.every(key => actual.includes(key));
  }

  function finiteNonNegative(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }

  function nullableNutrient(value) {
    return value === null || finiteNonNegative(value);
  }

  function projectPantry(pantry) {
    if (!Array.isArray(pantry) || pantry.length === 0 || pantry.length > MAX_PANTRY_ITEMS) {
      throw new TypeError("Pantry suggestions require between 1 and 200 foods");
    }
    const ids = new Set();
    return pantry.map(food => {
      if (!food || typeof food !== "object" || Array.isArray(food) ||
          typeof food.id !== "string" || !food.id.trim() || food.id.length > 256 ||
          ids.has(food.id) || typeof food.name !== "string" || !food.name.trim() ||
          food.name.length > 160 || !VALID_UNITS.has(food.unit)) {
        throw new TypeError("Pantry contains an invalid or duplicate food identity");
      }
      ids.add(food.id);
      const projected = {
        id: food.id,
        name: food.name.trim(),
        unit: food.unit
      };
      for (const key of NUTRIENT_FIELDS) {
        const value = food[key];
        projected[key] = value === "" || value === undefined || value === null ? null : Number(value);
        if (!nullableNutrient(projected[key])) {
          throw new TypeError("Pantry contains an invalid nutrient value");
        }
      }
      if (projected.protein100 === null || projected.kcal100 === null) {
        throw new TypeError("Pantry foods require protein and calorie values");
      }
      return projected;
    });
  }

  function projectRemaining(remaining) {
    if (!exactKeys(remaining, ["protein", "kcal", "carbs"]) ||
        !finiteNonNegative(remaining.protein) ||
        !finiteNonNegative(remaining.kcal) ||
        !finiteNonNegative(remaining.carbs)) {
      throw new TypeError("Pantry suggestions require non-negative remaining targets");
    }
    return {
      protein: remaining.protein,
      kcal: remaining.kcal,
      carbs: remaining.carbs
    };
  }

  function calculateTotals(items) {
    const totals = {};
    for (const [sourceKey, resultKey] of RESULT_NUTRIENTS) {
      if (items.some(item => item.requestFood[sourceKey] === null)) {
        totals[resultKey] = null;
        continue;
      }
      totals[resultKey] = items.reduce((sum, item) => {
        const divisor = item.requestFood.unit === "un" ? 1 : 100;
        return sum + (item.requestFood[sourceKey] * item.quantity / divisor);
      }, 0);
    }
    return totals;
  }

  function validateAndHydrate(response, pantrySnapshot, canonicalPantry = pantrySnapshot) {
    if (!exactKeys(response, ["contractVersion", "suggestions"]) ||
        response.contractVersion !== CONTRACT_VERSION ||
        !Array.isArray(response.suggestions) || response.suggestions.length === 0 ||
        response.suggestions.length > MAX_SUGGESTIONS) {
      throw new TypeError("Invalid pantry suggestions response");
    }
    const foodsById = new Map(pantrySnapshot.map(food => [food.id, food]));
    const canonicalFoodsById = new Map(canonicalPantry.map(food => [food.id, food]));
    return response.suggestions.map(suggestion => {
      if (!exactKeys(suggestion, ["name", "items"]) ||
          typeof suggestion.name !== "string" || !suggestion.name.trim() ||
          suggestion.name.length > 160 || !Array.isArray(suggestion.items) ||
          suggestion.items.length === 0 || suggestion.items.length > MAX_ITEMS_PER_SUGGESTION) {
        throw new TypeError("Invalid pantry suggestion");
      }
      const usedIds = new Set();
      const items = suggestion.items.map(item => {
        if (!exactKeys(item, ["foodId", "quantity"]) ||
            typeof item.foodId !== "string" || usedIds.has(item.foodId) ||
            !foodsById.has(item.foodId) || typeof item.quantity !== "number" ||
            !Number.isFinite(item.quantity) || item.quantity <= 0 ||
            item.quantity > MAX_QUANTITY) {
          throw new TypeError("Pantry suggestion references an invalid food or quantity");
        }
        usedIds.add(item.foodId);
        return {
          foodId: item.foodId,
          quantity: item.quantity,
          requestFood: foodsById.get(item.foodId),
          food: canonicalFoodsById.get(item.foodId)
        };
      });
      const totals = calculateTotals(items);
      return {
        name: suggestion.name.trim(),
        items: items.map(({ foodId, quantity, food }) => ({ foodId, quantity, food })),
        ...totals
      };
    });
  }

  function createPantrySuggestionsAI({ requestStructuredPantrySuggestions }) {
    if (typeof requestStructuredPantrySuggestions !== "function") {
      throw new TypeError("PantrySuggestionsAI requires requestStructuredPantrySuggestions");
    }

    async function requestPantrySuggestions({ pantry, remaining, language }) {
      if (!VALID_LANGUAGES.has(language)) {
        throw new TypeError("Pantry suggestions require a supported language");
      }
      const pantrySnapshot = projectPantry(pantry);
      const response = await requestStructuredPantrySuggestions({
        contractVersion: CONTRACT_VERSION,
        language,
        remaining: projectRemaining(remaining),
        pantry: pantrySnapshot
      });
      return validateAndHydrate(response, pantrySnapshot, pantry.map(food => ({ ...food })));
    }

    return { requestPantrySuggestions };
  }

  return {
    CONTRACT_VERSION,
    createPantrySuggestionsAI,
    validateAndHydrate
  };
});
