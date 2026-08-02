import '../../image-meal-flow.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { initialState, classifyError, createImageMealFlow } = readLegacyNamespace(
  globalThis,
  'ImageMealFlow',
  ['initialState', 'classifyError', 'createImageMealFlow'],
);

export { initialState, classifyError, createImageMealFlow };
