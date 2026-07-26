import '../../nutrition-tracker-controller.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createNutritionTrackerController } = readLegacyNamespace(
  globalThis,
  'NutritionTrackerController',
  ['createNutritionTrackerController'],
);

export { createNutritionTrackerController };
