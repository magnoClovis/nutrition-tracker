import '../../firebase-auth-internal.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createFirebaseAuth } = readLegacyNamespace(
  globalThis,
  'FirebaseAuthInternal',
  ['createFirebaseAuth'],
);

export { createFirebaseAuth };
