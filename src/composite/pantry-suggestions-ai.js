import '../../pantry-suggestions-ai.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createPantrySuggestionsAI } = readLegacyNamespace(
  globalThis,
  'PantrySuggestionsAI',
  ['createPantrySuggestionsAI'],
);

export { createPantrySuggestionsAI };
