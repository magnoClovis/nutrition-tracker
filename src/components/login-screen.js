import '../../login-screen.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createLoginScreen } = readLegacyNamespace(
  globalThis,
  'LoginScreenModule',
  ['createLoginScreen'],
);

export { createLoginScreen };
