import '../../pantry-screen.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createPantryScreen } = readLegacyNamespace(
  globalThis,
  'PantryScreenModule',
  ['createPantryScreen'],
);

export { createPantryScreen };
