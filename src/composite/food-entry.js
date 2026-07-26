import '../../food-entry.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createFoodEntry } = readLegacyNamespace(globalThis, 'FoodEntry', ['createFoodEntry']);

export { createFoodEntry };
