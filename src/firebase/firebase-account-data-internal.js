import '../../firebase-account-data-internal.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createFirebaseAccountData } = readLegacyNamespace(
  globalThis,
  'FirebaseAccountDataInternal',
  ['createFirebaseAccountData'],
);

export { createFirebaseAccountData };
