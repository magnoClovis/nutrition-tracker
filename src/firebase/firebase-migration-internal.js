import '../../firebase-migration-internal.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createFirebaseMigration } = readLegacyNamespace(
  globalThis,
  'FirebaseMigrationInternal',
  ['createFirebaseMigration'],
);

export { createFirebaseMigration };
