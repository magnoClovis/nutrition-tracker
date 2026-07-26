import '../../verify-email-screen.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createVerifyEmailScreen } = readLegacyNamespace(
  globalThis,
  'VerifyEmailScreenModule',
  ['createVerifyEmailScreen'],
);

export { createVerifyEmailScreen };
