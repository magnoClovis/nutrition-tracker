import '../../meal-review-ai.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createMealReviewAI } = readLegacyNamespace(
  globalThis,
  'MealReviewAI',
  ['createMealReviewAI'],
);

export { createMealReviewAI };
