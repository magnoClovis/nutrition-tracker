import '../../required-profile-modal.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createRequiredProfileModal } = readLegacyNamespace(
  globalThis,
  'RequiredProfileModalModule',
  ['createRequiredProfileModal'],
);

export { createRequiredProfileModal };
