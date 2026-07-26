import '../../meal-review-modal.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createMealReviewModal } = readLegacyNamespace(
  globalThis,
  'MealReviewModalModule',
  ['createMealReviewModal'],
);

export { createMealReviewModal };
