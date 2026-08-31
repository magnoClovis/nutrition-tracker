import '../../meal-review-ai.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { PROMPT_VERSION, buildMealReviewPrompt, createMealReviewAI } = readLegacyNamespace(
  globalThis,
  'MealReviewAI',
  ['PROMPT_VERSION', 'buildMealReviewPrompt', 'createMealReviewAI'],
);

export { PROMPT_VERSION, buildMealReviewPrompt, createMealReviewAI };
