import '../../food-autofill-ai.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createFoodAutofillAI, FoodEstimateValidationError, NUTRIENT_FIELDS } = readLegacyNamespace(
  globalThis,
  'FoodAutofillAI',
  ['createFoodAutofillAI', 'FoodEstimateValidationError', 'NUTRIENT_FIELDS'],
);

export { createFoodAutofillAI, FoodEstimateValidationError, NUTRIENT_FIELDS };
