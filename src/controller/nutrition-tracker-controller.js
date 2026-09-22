import '../../nutrition-tracker-controller.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createNutritionTrackerController, requestSessionExpiredReauthentication } = readLegacyNamespace(
  globalThis,
  'NutritionTrackerController',
  ['createNutritionTrackerController', 'requestSessionExpiredReauthentication'],
);

export { createNutritionTrackerController, requestSessionExpiredReauthentication };
