import '../../nutrition-feedback-ai.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createNutritionFeedbackAI } = readLegacyNamespace(
  globalThis,
  'NutritionFeedbackAI',
  ['createNutritionFeedbackAI'],
);

export { createNutritionFeedbackAI };
