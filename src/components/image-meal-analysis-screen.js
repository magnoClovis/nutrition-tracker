import '../../image-meal-analysis-screen.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createImageMealAnalysisScreen } = readLegacyNamespace(
  globalThis,
  'ImageMealAnalysisScreenModule',
  ['createImageMealAnalysisScreen'],
);

export { createImageMealAnalysisScreen };
