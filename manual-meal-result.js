/**
 * Pure adapter between saved pantry foods and the shared meal-result contract.
 * Persistence remains owned by NutritionTrackerController.
 *
 * @module ManualMealResult
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ManualMealResult = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const nutrientMap = Object.freeze({
    protein: "protein100",
    kcal: "kcal100",
    carbs: "carbs100",
    fat: "fat100",
    fiber: "fiber100",
    salt: "salt100",
    sugars: "sugars100",
    satfat: "satfat100"
  });

  function finite(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function defaultManualQuantity(food) {
    if (food?.unit === "un") return 1;
    const portion = finite(food?.portionSize);
    return portion && portion > 0 ? portion : 100;
  }

  function createManualMealEstimate(food, quantity = defaultManualQuantity(food)) {
    if (!food || typeof food !== "object" || !String(food.id || "").trim()) {
      throw new TypeError("A saved food with an id is required");
    }
    const nextQuantity = finite(quantity);
    if (nextQuantity === null || nextQuantity <= 0) {
      throw new TypeError("Manual meal quantity must be positive");
    }
    const unit = String(food.unit || "g");
    const divisor = unit === "un" ? 1 : 100;
    const factor = nextQuantity / divisor;
    const item = {
      id: `saved-${food.id}`,
      name: String(food.name || "").trim(),
      quantity: nextQuantity,
      unit,
      estimatedGrams: nextQuantity,
      confidence: "high",
      sourceFoodId: String(food.id)
    };
    Object.entries(nutrientMap).forEach(([target, source]) => {
      const value = finite(food[source]);
      item[target] = value === null ? null : Math.round(value * factor * 10000) / 10000;
    });
    return {
      status: "identified",
      dishName: item.name,
      overallConfidence: "high",
      assumptions: [],
      resultSource: "saved-food",
      portionUnit: unit,
      items: [item]
    };
  }

  function resolveManualMealQuantity(estimate) {
    const item = Array.isArray(estimate?.items) ? estimate.items[0] : null;
    const quantity = finite(item?.estimatedGrams);
    return quantity !== null && quantity > 0 ? quantity : null;
  }

  return { createManualMealEstimate, defaultManualQuantity, resolveManualMealQuantity };
});
