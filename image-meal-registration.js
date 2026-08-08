/**
 * Converts a reviewed image estimate into the established diary-entry shape.
 * Image bytes and preview URLs are deliberately outside this contract.
 *
 * @module ImageMealRegistration
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ImageMealRegistration = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const NUTRIENT_FIELDS = Object.freeze([
    "protein", "kcal", "carbs", "fat", "fiber", "salt", "sugars", "satfat"
  ]);

  function finiteNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function createImageMealRegistration({ createEntryId, mealKeys }) {
    if (typeof createEntryId !== "function" || !Array.isArray(mealKeys) || mealKeys.length === 0) {
      throw new TypeError("ImageMealRegistration requires createEntryId and mealKeys");
    }
    const allowedMeals = new Set(mealKeys);

    function buildImageMealRegistration({ estimate, meal, time }) {
      if (!estimate || !Array.isArray(estimate.items) || estimate.items.length === 0) {
        throw new TypeError("A reviewed image meal estimate is required");
      }
      if (!allowedMeals.has(meal)) throw new TypeError("A valid meal category is required");
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || ""))) {
        throw new TypeError("A valid meal time is required");
      }

      const items = estimate.items.map(item => {
        const entry = {
          id: String(createEntryId()),
          foodId: null,
          name: String(item.name || "").trim(),
          qty: finiteNumber(item.quantity),
          unit: String(item.unit || "").trim(),
          time,
          _estimated: true,
          _estimateSource: "image"
        };
        NUTRIENT_FIELDS.forEach(field => {
          entry[field] = finiteNumber(item[field]);
        });
        return entry;
      });

      return { meal, items };
    }

    return { buildImageMealRegistration };
  }

  return { NUTRIENT_FIELDS, createImageMealRegistration };
});
