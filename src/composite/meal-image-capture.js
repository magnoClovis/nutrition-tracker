import '../../meal-image-capture.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const {
  MAX_IMAGE_DIMENSION,
  MAX_PROCESSED_IMAGE_BYTES,
  JPEG_QUALITY,
  MealImageCaptureError,
  calculateContainedDimensions,
  createMealImageCapture,
} = readLegacyNamespace(globalThis, 'MealImageCapture', [
  'MAX_IMAGE_DIMENSION',
  'MAX_PROCESSED_IMAGE_BYTES',
  'JPEG_QUALITY',
  'MealImageCaptureError',
  'calculateContainedDimensions',
  'createMealImageCapture',
]);

export {
  MAX_IMAGE_DIMENSION,
  MAX_PROCESSED_IMAGE_BYTES,
  JPEG_QUALITY,
  MealImageCaptureError,
  calculateContainedDimensions,
  createMealImageCapture,
};
