import '../../meal-score.js';
import { readLegacyNamespace } from './read-legacy-namespace.js';

const {
  ALGORITHM_VERSION,
  DEFAULT_WINDOW_HOURS,
  DEFAULT_CONFIG,
  hoursUntilLocalMidnight,
  hoursUntilCivilMidnight,
  timeShare,
  contextualTimeShare,
  maximizeScore,
  budgetScore,
  targetScore,
  limitScore,
  calculateMealScore,
} = readLegacyNamespace(globalThis, 'MealScore', [
  'ALGORITHM_VERSION',
  'DEFAULT_WINDOW_HOURS',
  'DEFAULT_CONFIG',
  'hoursUntilLocalMidnight',
  'hoursUntilCivilMidnight',
  'timeShare',
  'contextualTimeShare',
  'maximizeScore',
  'budgetScore',
  'targetScore',
  'limitScore',
  'calculateMealScore',
]);

export {
  ALGORITHM_VERSION,
  DEFAULT_WINDOW_HOURS,
  DEFAULT_CONFIG,
  hoursUntilLocalMidnight,
  hoursUntilCivilMidnight,
  timeShare,
  contextualTimeShare,
  maximizeScore,
  budgetScore,
  targetScore,
  limitScore,
  calculateMealScore,
};
