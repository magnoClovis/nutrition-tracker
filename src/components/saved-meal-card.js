import '../../saved-meal-card.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createSavedMealCard } = readLegacyNamespace(
  globalThis,
  'SavedMealCardModule',
  ['createSavedMealCard'],
);

export { createSavedMealCard };
