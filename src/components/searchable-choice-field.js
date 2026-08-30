import '../../searchable-choice-field.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createSearchableChoiceField } = readLegacyNamespace(
  globalThis,
  'SearchableChoiceFieldModule',
  ['createSearchableChoiceField'],
);

export { createSearchableChoiceField };
