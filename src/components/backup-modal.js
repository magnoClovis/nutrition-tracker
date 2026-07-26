import '../../backup-modal.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createBackupModal } = readLegacyNamespace(
  globalThis,
  'BackupModalModule',
  ['createBackupModal'],
);

export { createBackupModal };
