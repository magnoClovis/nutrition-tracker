import '../../firebase-firestore-internal.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createFirebaseFirestore } = readLegacyNamespace(
  globalThis,
  'FirebaseFirestoreInternal',
  ['createFirebaseFirestore'],
);

export { createFirebaseFirestore };
