import '../../firebase-backup-merge-internal.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const FirebaseBackupMergeInternal = readLegacyNamespace(
  globalThis,
  'FirebaseBackupMergeInternal',
  ['normalizedIdentity', 'richnessScore', 'mergeArrayValues', 'mergeObjectValues'],
);

export const {
  normalizedIdentity,
  richnessScore,
  mergeArrayValues,
  mergeObjectValues,
} = FirebaseBackupMergeInternal;
