import '../../add-screen.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createAddScreen } = readLegacyNamespace(
  globalThis,
  'AddScreenModule',
  ['createAddScreen'],
);

export { createAddScreen };
