import '../../image-meal-registration.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { NUTRIENT_FIELDS, createImageMealRegistration } = readLegacyNamespace(
  globalThis,
  'ImageMealRegistration',
  ['NUTRIENT_FIELDS', 'createImageMealRegistration'],
);

export { NUTRIENT_FIELDS, createImageMealRegistration };
