import '../../release-notice.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createReleaseNotice } = readLegacyNamespace(
  globalThis,
  'ReleaseNotice',
  ['createReleaseNotice'],
);

export { createReleaseNotice };
