import '../../ga-result-card.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createGaResultCard } = readLegacyNamespace(
  globalThis,
  'GaResultCardModule',
  ['createGaResultCard'],
);

export { createGaResultCard };
