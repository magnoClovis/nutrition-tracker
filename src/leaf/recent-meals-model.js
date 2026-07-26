import '../../recent-meals-model.js';
import { readLegacyNamespace } from './read-legacy-namespace.js';

const { createRecentMealsModel } = readLegacyNamespace(globalThis, 'RecentMealsModel', [
  'createRecentMealsModel',
]);

export { createRecentMealsModel };
