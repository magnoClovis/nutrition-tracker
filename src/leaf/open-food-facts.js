import '../../open-food-facts.js';
import { readLegacyNamespace } from './read-legacy-namespace.js';

const { createOpenFoodFacts } = readLegacyNamespace(globalThis, 'OpenFoodFacts', [
  'createOpenFoodFacts',
]);

export { createOpenFoodFacts };
