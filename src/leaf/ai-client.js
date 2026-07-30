import '../../ai-client.js';
import { readLegacyNamespace } from './read-legacy-namespace.js';

const { createAIClient, AIClientError } = readLegacyNamespace(globalThis, 'AIClient', [
  'createAIClient',
  'AIClientError',
]);

export { createAIClient, AIClientError };
