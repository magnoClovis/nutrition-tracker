import '../../diary-screen.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createDiaryScreen } = readLegacyNamespace(
  globalThis,
  'DiaryScreenModule',
  ['createDiaryScreen'],
);

export { createDiaryScreen };
