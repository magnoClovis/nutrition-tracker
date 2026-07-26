import '../../firebase-config-internal.js';
import { readLegacyNamespace } from './read-legacy-namespace.js';

const { createFirebaseConfig } = readLegacyNamespace(globalThis, 'FirebaseConfigInternal', [
  'createFirebaseConfig',
]);

export { createFirebaseConfig };
