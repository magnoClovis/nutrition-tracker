import '../../food-autofill-ai.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createFoodAutofillAI } = readLegacyNamespace(
  globalThis,
  'FoodAutofillAI',
  ['createFoodAutofillAI'],
);

export { createFoodAutofillAI };
