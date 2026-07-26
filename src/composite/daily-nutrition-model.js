import '../../daily-nutrition-model.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createDailyNutritionModel } = readLegacyNamespace(
  globalThis,
  'DailyNutritionModel',
  ['createDailyNutritionModel'],
);

export { createDailyNutritionModel };
