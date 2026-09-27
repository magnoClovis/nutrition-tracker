import '../../meal-result-sheet.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createMealResultSheet, totalEstimatedGrams, scaleEstimateToTotalGrams, resolveMealResultSnap } = readLegacyNamespace(
  globalThis,
  'MealResultSheetModule',
  ['createMealResultSheet', 'totalEstimatedGrams', 'scaleEstimateToTotalGrams', 'resolveMealResultSnap'],
);

export { createMealResultSheet, totalEstimatedGrams, scaleEstimateToTotalGrams, resolveMealResultSnap };
