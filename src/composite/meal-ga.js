import '../../meal-ga.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createMealGA } = readLegacyNamespace(globalThis, 'MealGA', ['createMealGA']);

export { createMealGA };
