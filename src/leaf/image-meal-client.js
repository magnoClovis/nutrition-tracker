import '../../image-meal-client.js';
import { readLegacyNamespace } from './read-legacy-namespace.js';

const {
  IMAGE_MEAL_ENDPOINT,
  ImageMealClientError,
  createImageMealClient,
} = readLegacyNamespace(globalThis, 'ImageMealClient', [
  'IMAGE_MEAL_ENDPOINT',
  'ImageMealClientError',
  'createImageMealClient',
]);

export { IMAGE_MEAL_ENDPOINT, ImageMealClientError, createImageMealClient };
