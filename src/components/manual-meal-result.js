import '../../manual-meal-result.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createManualMealEstimate, defaultManualQuantity, resolveManualMealQuantity } = readLegacyNamespace(
  globalThis,
  'ManualMealResult',
  ['createManualMealEstimate', 'defaultManualQuantity', 'resolveManualMealQuantity'],
);

export { createManualMealEstimate, defaultManualQuantity, resolveManualMealQuantity };
