import '../../history-loaders.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createHistoryLoaders } = readLegacyNamespace(
  globalThis,
  'HistoryLoaders',
  ['createHistoryLoaders'],
);

export { createHistoryLoaders };
