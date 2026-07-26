import '../../goal-calculator.js';
import { readLegacyNamespace } from './read-legacy-namespace.js';

const { createGoalCalculator } = readLegacyNamespace(globalThis, 'GoalCalculator', [
  'createGoalCalculator',
]);

export { createGoalCalculator };
