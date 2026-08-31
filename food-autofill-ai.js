/** Strict structured nutrition autofill client adapter. @module FoodAutofillAI */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FoodAutofillAI = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const NUTRIENT_FIELDS = Object.freeze([
    "protein100", "kcal100", "carbs100", "sugars100",
    "fat100", "satfat100", "fiber100", "salt100"
  ]);
  const CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);

  class FoodEstimateValidationError extends Error {
    constructor() {
      super("invalid-food-estimate");
      this.name = "FoodEstimateValidationError";
      this.code = "invalid-response";
    }
  }

  function exactKeys(value, keys) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const actual = Object.keys(value);
    return actual.length === keys.length && keys.every(key => actual.includes(key));
  }

  function nullableNumber(value, maximum = 1_000_000) {
    return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum);
  }

  function validateEstimate(value, unit) {
    if (!exactKeys(value, ["status", "reason", "confidence", "unitWeightG", "nutrients"]) ||
        !["estimated", "rejected"].includes(value.status) ||
        !exactKeys(value.nutrients, NUTRIENT_FIELDS) ||
        !NUTRIENT_FIELDS.every(field => nullableNumber(value.nutrients[field]))) return false;
    if (value.status === "rejected") {
      return typeof value.reason === "string" && value.reason.trim().length > 0 && value.reason.length <= 240 &&
        value.confidence === null && value.unitWeightG === null &&
        NUTRIENT_FIELDS.every(field => value.nutrients[field] === null);
    }
    return value.reason === null && CONFIDENCE_LEVELS.has(value.confidence) &&
      value.nutrients.protein100 !== null && value.nutrients.kcal100 !== null &&
      (unit === "un"
        ? nullableNumber(value.unitWeightG, 100_000) && value.unitWeightG > 0
        : value.unitWeightG === null);
  }

  function createFoodAutofillAI({ requestStructuredFoodEstimate, normalizeLanguage }) {
    if (typeof requestStructuredFoodEstimate !== "function" || typeof normalizeLanguage !== "function") {
      throw new TypeError("FoodAutofillAI requires structured transport and normalizeLanguage");
    }

    async function requestFoodAutofill({ foodName, unit, lang }) {
      const trimmedFoodName = String(foodName || "").trim();
      if (!trimmedFoodName) return { status: "empty-name" };
      const estimate = await requestStructuredFoodEstimate({
        foodName: trimmedFoodName,
        unit,
        language: normalizeLanguage(lang)
      });
      if (!validateEstimate(estimate, unit)) throw new FoodEstimateValidationError();
      if (estimate.status === "rejected") return { status: "rejected", reason: estimate.reason };

      if (unit === "un") {
        const scale = value => value === null ? null : Math.round(value * estimate.unitWeightG) / 100;
        return {
          status: "success",
          mode: "unit",
          confidence: estimate.confidence,
          unitWeightG: estimate.unitWeightG,
          fields: Object.fromEntries(NUTRIENT_FIELDS.map(field => [field, scale(estimate.nutrients[field])]))
        };
      }
      return {
        status: "success",
        mode: "standard",
        confidence: estimate.confidence,
        unitWeightG: null,
        fields: { ...estimate.nutrients }
      };
    }

    function applyFoodAutofillResult(currentForm, result) {
      const nextForm = { ...currentForm };
      NUTRIENT_FIELDS.forEach(field => {
        if (result.fields[field] !== null) nextForm[field] = String(result.fields[field]);
      });
      if (result.mode === "unit") nextForm.unitWeightG = "";
      return nextForm;
    }

    return { requestFoodAutofill, applyFoodAutofillResult };
  }

  return { NUTRIENT_FIELDS, FoodEstimateValidationError, createFoodAutofillAI };
});
