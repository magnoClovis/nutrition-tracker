import '../../meal-estimate-editor.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createMealEstimateEditor } = readLegacyNamespace(
  globalThis,
  'MealEstimateEditorModule',
  ['createMealEstimateEditor'],
);

export { createMealEstimateEditor };
