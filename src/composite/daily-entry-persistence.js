import '../../daily-entry-persistence.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const {
  createDailyEntryPersistence,
  diffDailyEntrySnapshots,
  supportsGranularDailyPersistence,
} = readLegacyNamespace(globalThis, 'DailyEntryPersistence', [
  'createDailyEntryPersistence',
  'diffDailyEntrySnapshots',
  'supportsGranularDailyPersistence',
]);

export {
  createDailyEntryPersistence,
  diffDailyEntrySnapshots,
  supportsGranularDailyPersistence,
};
