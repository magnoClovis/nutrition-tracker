import '../../groq-client.js';
import { readLegacyNamespace } from './read-legacy-namespace.js';

const { createGroqClient, GroqClientError } = readLegacyNamespace(globalThis, 'GroqClient', [
  'createGroqClient',
  'GroqClientError',
]);

export { createGroqClient, GroqClientError };
