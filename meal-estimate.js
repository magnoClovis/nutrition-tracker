/**
 * Shared contract and validation for editable AI meal estimates.
 *
 * The module is intentionally independent from image capture, AI transport,
 * React state, and persistence. Text and image flows can therefore converge on
 * one validated estimate shape without coupling the editor to either source.
 *
 * @module MealEstimate
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MealEstimate = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const ESTIMATE_STATUSES = Object.freeze([
    "identified",
    "uncertain",
    "not-food",
    "not-identifiable"
  ]);
  const CONFIDENCE_LEVELS = Object.freeze(["high", "medium", "low"]);
  const NUTRIENT_FIELDS = Object.freeze([
    "protein",
    "kcal",
    "carbs",
    "fat",
    "fiber",
    "salt",
    "sugars",
    "satfat"
  ]);
  const REQUIRED_NUTRIENTS = new Set(["protein", "kcal"]);
  const MAX_ITEMS = 12;
  const MAX_ASSUMPTIONS = 12;

  const confidenceAliases = Object.freeze({
    high: "high",
    alta: "high",
    medium: "medium",
    media: "medium",
    "m\u00e9dia": "medium",
    low: "low",
    baixa: "low",
    baja: "low"
  });

  class MealEstimateValidationError extends Error {
    constructor(errors) {
      super("invalid-meal-estimate");
      this.name = "MealEstimateValidationError";
      this.code = "invalid-meal-estimate";
      this.errors = Array.isArray(errors) ? errors : [];
    }
  }

  function own(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
  }

  function textValue(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function normalizedConfidence(value) {
    return confidenceAliases[textValue(value).toLowerCase()] || null;
  }

  function finiteNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function validationError(path, code) {
    return { path, code };
  }

  function validateMealEstimate(value) {
    const errors = [];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { valid: false, errors: [validationError("estimate", "object-required")] };
    }

    const status = textValue(value.status);
    if (!ESTIMATE_STATUSES.includes(status)) {
      errors.push(validationError("status", "invalid-status"));
    }

    const actionable = status === "identified" || status === "uncertain";
    const dishName = textValue(value.dishName);
    if (actionable && !dishName) {
      errors.push(validationError("dishName", "required"));
    } else if (dishName.length > 120) {
      errors.push(validationError("dishName", "too-long"));
    }

    if (actionable && !CONFIDENCE_LEVELS.includes(normalizedConfidence(value.overallConfidence))) {
      errors.push(validationError("overallConfidence", "invalid-confidence"));
    }

    const assumptions = value.assumptions;
    if (!Array.isArray(assumptions)) {
      errors.push(validationError("assumptions", "array-required"));
    } else {
      if (assumptions.length > MAX_ASSUMPTIONS) {
        errors.push(validationError("assumptions", "too-many"));
      }
      assumptions.forEach((assumption, index) => {
        const normalized = textValue(assumption);
        if (normalized.length > 240) errors.push(validationError(`assumptions.${index}`, "too-long"));
      });
    }

    if (!Array.isArray(value.items)) {
      errors.push(validationError("items", "array-required"));
      return { valid: false, errors };
    }
    if (actionable && value.items.length === 0) {
      errors.push(validationError("items", "item-required"));
    }
    if (value.items.length > MAX_ITEMS) {
      errors.push(validationError("items", "too-many"));
    }

    const ids = new Set();
    value.items.forEach((item, index) => {
      const path = `items.${index}`;
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        errors.push(validationError(path, "object-required"));
        return;
      }

      const id = textValue(item.id);
      if (!id) {
        errors.push(validationError(`${path}.id`, "required"));
      } else if (ids.has(id)) {
        errors.push(validationError(`${path}.id`, "duplicate"));
      } else {
        ids.add(id);
      }

      const name = textValue(item.name);
      if (!name) errors.push(validationError(`${path}.name`, "required"));
      if (name.length > 120) errors.push(validationError(`${path}.name`, "too-long"));

      const quantity = finiteNumber(item.quantity);
      if (quantity === null || quantity <= 0 || quantity > 100000) {
        errors.push(validationError(`${path}.quantity`, "invalid-positive-number"));
      }

      const unit = textValue(item.unit);
      if (!unit) errors.push(validationError(`${path}.unit`, "required"));
      if (unit.length > 24) errors.push(validationError(`${path}.unit`, "too-long"));

      const estimatedGrams = finiteNumber(item.estimatedGrams);
      if (item.estimatedGrams !== null && item.estimatedGrams !== undefined && item.estimatedGrams !== "" &&
          (estimatedGrams === null || estimatedGrams < 0 || estimatedGrams > 100000)) {
        errors.push(validationError(`${path}.estimatedGrams`, "invalid-nonnegative-number"));
      }

      if (!CONFIDENCE_LEVELS.includes(normalizedConfidence(item.confidence))) {
        errors.push(validationError(`${path}.confidence`, "invalid-confidence"));
      }

      NUTRIENT_FIELDS.forEach(field => {
        const number = finiteNumber(item[field]);
        if (REQUIRED_NUTRIENTS.has(field) && number === null) {
          errors.push(validationError(`${path}.${field}`, "required-number"));
          return;
        }
        if (own(item, field) && item[field] !== null && item[field] !== undefined && item[field] !== "" &&
            (number === null || number < 0 || number > 1000000)) {
          errors.push(validationError(`${path}.${field}`, "invalid-nonnegative-number"));
        }
      });
    });

    return { valid: errors.length === 0, errors };
  }

  function createMealEstimate({ createItemId }) {
    if (typeof createItemId !== "function") {
      throw new TypeError("MealEstimate requires a createItemId function");
    }

    function createEmptyItem() {
      return {
        id: String(createItemId()),
        name: "",
        quantity: 1,
        unit: "portion",
        estimatedGrams: null,
        protein: null,
        kcal: null,
        carbs: null,
        fat: null,
        fiber: null,
        salt: null,
        sugars: null,
        satfat: null,
        confidence: "low"
      };
    }

    function normalizeItem(item) {
      const source = item && typeof item === "object" ? item : {};
      const result = {
        id: textValue(source.id) || String(createItemId()),
        name: textValue(source.name),
        quantity: finiteNumber(source.quantity),
        unit: textValue(source.unit),
        estimatedGrams: finiteNumber(source.estimatedGrams),
        confidence: normalizedConfidence(source.confidence)
      };
      NUTRIENT_FIELDS.forEach(field => {
        result[field] = finiteNumber(source[field]);
      });
      return result;
    }

    function normalizeMealEstimate(value) {
      const source = value && typeof value === "object" ? value : {};
      const normalized = {
        status: textValue(source.status),
        dishName: textValue(source.dishName),
        overallConfidence: normalizedConfidence(source.overallConfidence),
        assumptions: Array.isArray(source.assumptions)
          ? source.assumptions.map(textValue).filter(Boolean)
          : [],
        items: Array.isArray(source.items) ? source.items.map(normalizeItem) : []
      };
      const validation = validateMealEstimate(normalized);
      if (!validation.valid) throw new MealEstimateValidationError(validation.errors);
      return normalized;
    }

    function calculateTotals(value) {
      const items = Array.isArray(value?.items) ? value.items : [];
      return Object.fromEntries(NUTRIENT_FIELDS.map(field => {
        const known = items
          .map(item => finiteNumber(item && item[field]))
          .filter(number => number !== null);
        const total = known.length
          ? Math.round(known.reduce((sum, number) => sum + number, 0) * 100) / 100
          : null;
        return [field, total];
      }));
    }

    return {
      createEmptyItem,
      normalizeMealEstimate,
      calculateTotals
    };
  }

  return {
    ESTIMATE_STATUSES,
    CONFIDENCE_LEVELS,
    NUTRIENT_FIELDS,
    MAX_ITEMS,
    MealEstimateValidationError,
    validateMealEstimate,
    createMealEstimate
  };
});
