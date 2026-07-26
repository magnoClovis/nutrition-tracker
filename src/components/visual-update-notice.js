import '../../visual-update-notice.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createVisualUpdateNotice } = readLegacyNamespace(
  globalThis,
  'VisualUpdateNoticeModule',
  ['createVisualUpdateNotice'],
);

export { createVisualUpdateNotice };
