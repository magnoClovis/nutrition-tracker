import '../../image-meal-screen.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createImageMealScreen } = readLegacyNamespace(
  globalThis,
  'ImageMealScreenModule',
  ['createImageMealScreen'],
);

export { createImageMealScreen };
