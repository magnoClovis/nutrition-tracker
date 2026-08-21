import '../../account-deletion-client.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const AccountDeletionClient = readLegacyNamespace(
  globalThis,
  'AccountDeletionClient',
  [
    'REQUEST_ID_KEY',
    'PRESERVED_LOCAL_KEYS',
    'AccountDeletionClientError',
    'clearLocalAccountData',
    'createAccountDeletionClient',
  ],
);

export const {
  REQUEST_ID_KEY,
  PRESERVED_LOCAL_KEYS,
  AccountDeletionClientError,
  clearLocalAccountData,
  createAccountDeletionClient,
} = AccountDeletionClient;
