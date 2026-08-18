import '../../release-notice.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const {
  CURRENT_RELEASE,
  createReleaseNotice,
  hasSeenRelease,
  resolveReleaseTutorialType,
} = readLegacyNamespace(
  globalThis,
  'ReleaseNotice',
  [
    'CURRENT_RELEASE',
    'createReleaseNotice',
    'hasSeenRelease',
    'resolveReleaseTutorialType',
  ],
);

export {
  CURRENT_RELEASE,
  createReleaseNotice,
  hasSeenRelease,
  resolveReleaseTutorialType,
};
