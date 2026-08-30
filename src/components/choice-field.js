import '../../choice-field.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createChoiceField } = readLegacyNamespace(
  globalThis,
  'ChoiceFieldModule',
  ['createChoiceField'],
);

export { createChoiceField };
