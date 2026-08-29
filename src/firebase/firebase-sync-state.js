import '../../firebase-sync-state.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const {
  RETRY_DELAYS_MS,
  RETRYABLE_CODES,
  createFirestoreSyncState,
  normalizeIdentity,
  retryableError,
  sanitizedCode,
} = readLegacyNamespace(
  globalThis,
  'FirebaseSyncState',
  [
    'RETRY_DELAYS_MS',
    'RETRYABLE_CODES',
    'createFirestoreSyncState',
    'normalizeIdentity',
    'retryableError',
    'sanitizedCode',
  ],
);

export {
  RETRY_DELAYS_MS,
  RETRYABLE_CODES,
  createFirestoreSyncState,
  normalizeIdentity,
  retryableError,
  sanitizedCode,
};
