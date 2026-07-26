import '../../dish-description-ai.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createDishDescriptionAI } = readLegacyNamespace(
  globalThis,
  'DishDescriptionAI',
  ['createDishDescriptionAI'],
);

export { createDishDescriptionAI };
