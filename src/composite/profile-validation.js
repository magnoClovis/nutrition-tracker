import '../../profile-validation.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createProfileValidation } = readLegacyNamespace(
  globalThis,
  'ProfileValidation',
  ['createProfileValidation'],
);

export { createProfileValidation };
