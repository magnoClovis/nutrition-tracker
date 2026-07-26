import '../../meal-score.js';
import { readLegacyNamespace } from './read-legacy-namespace.js';

const {
  ALGORITHM_VERSION,
  DEFAULT_WINDOW_HOURS,
  DEFAULT_CONFIG,
  hoursUntilLocalMidnight,
  timeShare,
  maximizeScore,
  budgetScore,
  calculateMealScore,
} = readLegacyNamespace(globalThis, 'MealScore', [
  'ALGORITHM_VERSION',
  'DEFAULT_WINDOW_HOURS',
  'DEFAULT_CONFIG',
  'hoursUntilLocalMidnight',
  'timeShare',
  'maximizeScore',
  'budgetScore',
  'calculateMealScore',
]);

export {
  ALGORITHM_VERSION,
  DEFAULT_WINDOW_HOURS,
  DEFAULT_CONFIG,
  hoursUntilLocalMidnight,
  timeShare,
  maximizeScore,
  budgetScore,
  calculateMealScore,
};
