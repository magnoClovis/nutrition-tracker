import '../../firebase-backup-internal.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createFirebaseBackup } = readLegacyNamespace(
  globalThis,
  'FirebaseBackupInternal',
  ['createFirebaseBackup'],
);

export { createFirebaseBackup };
