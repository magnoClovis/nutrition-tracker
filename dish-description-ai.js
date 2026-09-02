/** Structured text-meal estimation sharing the C24 MealEstimate contract. @module DishDescriptionAI */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DishDescriptionAI = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const ACTIONABLE_STATUSES = new Set(["identified", "uncertain"]);
  const NUTRIENT_FIELDS = Object.freeze([
    "protein", "kcal", "carbs", "fat", "fiber", "salt", "sugars", "satfat"
  ]);

  function finiteNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function createDishDescriptionAI({
    requestStructuredDishEstimate,
    normalizeLanguage,
    normalizeMealEstimate,
    createEntryId
  }) {
    if (typeof requestStructuredDishEstimate !== "function" ||
        typeof normalizeLanguage !== "function" || typeof normalizeMealEstimate !== "function" ||
        typeof createEntryId !== "function") {
      throw new TypeError("DishDescriptionAI requires structured transport, MealEstimate normalization, language, and IDs");
    }

    async function requestDishEstimate({ description, lang }) {
      const dishDescription = String(description || "").trim();
      if (!dishDescription) return { status: "empty-description" };
      const remote = await requestStructuredDishEstimate({
        description: dishDescription,
        language: normalizeLanguage(lang)
      });
      const result = normalizeMealEstimate(remote);
      return ACTIONABLE_STATUSES.has(result.status)
        ? { status: "success", result }
        : { status: "not-identifiable", reason: result.status };
    }

    function buildDescribedEntries({ estimate, description }) {
      if (!estimate) return [];
      const reviewedEstimate = normalizeMealEstimate(estimate);
      return reviewedEstimate.items.map(item => {
        const entry = {
          id: String(createEntryId()),
          foodId: null,
          name: String(item.name || "").trim(),
          qty: finiteNumber(item.quantity),
          unit: String(item.unit || "").trim(),
          _estimated: true,
          _estimateSource: "description",
          _description: String(description || "").trim()
        };
        NUTRIENT_FIELDS.forEach(field => { entry[field] = finiteNumber(item[field]); });
        return entry;
      });
    }

    return { requestDishEstimate, buildDescribedEntries };
  }

  return { createDishDescriptionAI };
});
