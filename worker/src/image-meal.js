const IMAGE_MIME_TYPE = "image/jpeg";
const IMAGE_LANGUAGES = new Set(["pt", "en", "es"]);
const IMAGE_MEAL_STATUSES = new Set([
  "identified",
  "uncertain",
  "not-food",
  "not-identifiable"
]);
const CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);
const MAX_IMAGE_BYTES = 1_500_000;
const MAX_IMAGE_ITEMS = 12;
const MAX_IMAGE_ASSUMPTIONS = 12;
const MAX_IMAGE_OUTPUT_TOKENS = 1_200;
const MAX_NAME_CHARACTERS = 120;
const MAX_UNIT_CHARACTERS = 24;
const MAX_ASSUMPTION_CHARACTERS = 240;
const MAX_NUTRIENT_VALUE = 1_000_000;

const nullableNutrientSchema = Object.freeze({
  anyOf: [
    { type: "number", minimum: 0, maximum: MAX_NUTRIENT_VALUE },
    { type: "null" }
  ]
});

export const IMAGE_MEAL_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "dishName",
    "overallConfidence",
    "assumptions",
    "items"
  ],
  properties: {
    status: {
      type: "string",
      enum: [...IMAGE_MEAL_STATUSES]
    },
    dishName: { type: "string" },
    overallConfidence: {
      type: "string",
      enum: [...CONFIDENCE_LEVELS]
    },
    assumptions: {
      type: "array",
      maxItems: MAX_IMAGE_ASSUMPTIONS,
      items: { type: "string" }
    },
    items: {
      type: "array",
      maxItems: MAX_IMAGE_ITEMS,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "quantity",
          "unit",
          "estimatedGrams",
          "protein",
          "kcal",
          "carbs",
          "fat",
          "fiber",
          "salt",
          "sugars",
          "satfat",
          "confidence"
        ],
        properties: {
          name: { type: "string" },
          quantity: { type: "number", minimum: 0.01, maximum: 100_000 },
          unit: { type: "string" },
          estimatedGrams: nullableNutrientSchema,
          protein: { type: "number", minimum: 0, maximum: MAX_NUTRIENT_VALUE },
          kcal: { type: "number", minimum: 0, maximum: MAX_NUTRIENT_VALUE },
          carbs: nullableNutrientSchema,
          fat: nullableNutrientSchema,
          fiber: nullableNutrientSchema,
          salt: nullableNutrientSchema,
          sugars: nullableNutrientSchema,
          satfat: nullableNutrientSchema,
          confidence: {
            type: "string",
            enum: [...CONFIDENCE_LEVELS]
          }
        }
      }
    }
  }
});

const languageNames = Object.freeze({
  pt: "Brazilian Portuguese",
  en: "English",
  es: "Spanish"
});

function exactKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length && keys.every(key => actualKeys.includes(key));
}

function finiteNumber(value, { nullable = false, minimum = 0, maximum = MAX_NUTRIENT_VALUE } = {}) {
  if (nullable && value === null) return true;
  return typeof value === "number" && Number.isFinite(value) &&
    value >= minimum && value <= maximum;
}

function decodedBase64(value) {
  if (typeof value !== "string" || value.length === 0 || value.length % 4 !== 0 ||
      value.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    return null;
  }
  try {
    return atob(value);
  } catch (_) {
    return null;
  }
}

export function validateImageMealRequest(value) {
  if (!exactKeys(value, ["image", "language"]) ||
      !IMAGE_LANGUAGES.has(value.language) ||
      !exactKeys(value.image, ["mimeType", "data"]) ||
      value.image.mimeType !== IMAGE_MIME_TYPE) {
    return false;
  }

  const binary = decodedBase64(value.image.data);
  if (binary === null || binary.length > MAX_IMAGE_BYTES || binary.length < 3) return false;
  return binary.charCodeAt(0) === 0xff &&
    binary.charCodeAt(1) === 0xd8 &&
    binary.charCodeAt(2) === 0xff;
}

export function imageMealPrompt(language) {
  return [
    "Analyze the meal photo for a nutrition diary.",
    "Do not identify people or infer sensitive personal traits.",
    "Identify only visible foods and drinks. Estimate realistic quantities and nutrition for each detected item.",
    "Use status 'not-food' when the image is not food and 'not-identifiable' when food cannot be assessed reliably.",
    "Use status 'uncertain' when a meal is visible but important details are ambiguous.",
    "For identified or uncertain meals, include at least one item and state every material visual assumption.",
    "Protein and kcal must be numeric. Use null, never an invented zero, for optional nutrients that cannot be estimated.",
    `Write dishName, food names, units, and assumptions in ${languageNames[language]}.`,
    "Return only the structured response requested by the schema."
  ].join(" ");
}

export function geminiImageMealRequest(body) {
  return {
    contents: [{
      role: "user",
      parts: [{
        inlineData: {
          mimeType: body.image.mimeType,
          data: body.image.data
        },
        mediaResolution: {
          level: "MEDIA_RESOLUTION_HIGH"
        }
      }, {
        text: imageMealPrompt(body.language)
      }]
    }],
    generationConfig: {
      maxOutputTokens: MAX_IMAGE_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      responseJsonSchema: IMAGE_MEAL_RESPONSE_SCHEMA
    }
  };
}

function validText(value, maximumCharacters, { allowEmpty = false } = {}) {
  return typeof value === "string" && value.length <= maximumCharacters &&
    (allowEmpty || value.trim().length > 0);
}

function validItem(item) {
  if (!exactKeys(item, [
    "name",
    "quantity",
    "unit",
    "estimatedGrams",
    "protein",
    "kcal",
    "carbs",
    "fat",
    "fiber",
    "salt",
    "sugars",
    "satfat",
    "confidence"
  ])) return false;

  return validText(item.name, MAX_NAME_CHARACTERS) &&
    finiteNumber(item.quantity, { minimum: 0.01, maximum: 100_000 }) &&
    validText(item.unit, MAX_UNIT_CHARACTERS) &&
    finiteNumber(item.estimatedGrams, { nullable: true, maximum: 100_000 }) &&
    finiteNumber(item.protein) &&
    finiteNumber(item.kcal) &&
    finiteNumber(item.carbs, { nullable: true }) &&
    finiteNumber(item.fat, { nullable: true }) &&
    finiteNumber(item.fiber, { nullable: true }) &&
    finiteNumber(item.salt, { nullable: true }) &&
    finiteNumber(item.sugars, { nullable: true }) &&
    finiteNumber(item.satfat, { nullable: true }) &&
    CONFIDENCE_LEVELS.has(item.confidence);
}

export function validateImageMealEstimate(value) {
  if (!exactKeys(value, [
    "status",
    "dishName",
    "overallConfidence",
    "assumptions",
    "items"
  ]) || !IMAGE_MEAL_STATUSES.has(value.status) ||
      !validText(value.dishName, MAX_NAME_CHARACTERS, { allowEmpty: true }) ||
      !CONFIDENCE_LEVELS.has(value.overallConfidence) ||
      !Array.isArray(value.assumptions) || value.assumptions.length > MAX_IMAGE_ASSUMPTIONS ||
      !value.assumptions.every(item => validText(item, MAX_ASSUMPTION_CHARACTERS)) ||
      !Array.isArray(value.items) || value.items.length > MAX_IMAGE_ITEMS ||
      !value.items.every(validItem)) {
    return false;
  }

  const actionable = value.status === "identified" || value.status === "uncertain";
  if (actionable) return value.dishName.trim().length > 0 && value.items.length > 0;
  return value.items.length === 0;
}

export const IMAGE_MEAL_LIMITS = Object.freeze({
  maximumImageBytes: MAX_IMAGE_BYTES,
  maximumOutputTokens: MAX_IMAGE_OUTPUT_TOKENS
});
