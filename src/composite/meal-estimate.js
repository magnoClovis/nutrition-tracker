import '../../meal-estimate.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const {
  ESTIMATE_STATUSES,
  CONFIDENCE_LEVELS,
  NUTRIENT_FIELDS,
  MAX_ITEMS,
  MealEstimateValidationError,
  validateMealEstimate,
  createMealEstimate,
} = readLegacyNamespace(globalThis, 'MealEstimate', [
  'ESTIMATE_STATUSES',
  'CONFIDENCE_LEVELS',
  'NUTRIENT_FIELDS',
  'MAX_ITEMS',
  'MealEstimateValidationError',
  'validateMealEstimate',
  'createMealEstimate',
]);

export {
  ESTIMATE_STATUSES,
  CONFIDENCE_LEVELS,
  NUTRIENT_FIELDS,
  MAX_ITEMS,
  MealEstimateValidationError,
  validateMealEstimate,
  createMealEstimate,
};
