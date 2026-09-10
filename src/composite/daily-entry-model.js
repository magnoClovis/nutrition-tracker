import '../../daily-entry-model.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const {
  createIdempotentEntryId,
  ensureEntryId,
  ensureEntryIds,
  applyEntryListMutation,
  applyMealLogMutation,
  updateMealLogEntry,
} = readLegacyNamespace(globalThis, 'DailyEntryModel', [
  'createIdempotentEntryId',
  'ensureEntryId',
  'ensureEntryIds',
  'applyEntryListMutation',
  'applyMealLogMutation',
  'updateMealLogEntry',
]);

export {
  createIdempotentEntryId,
  ensureEntryId,
  ensureEntryIds,
  applyEntryListMutation,
  applyMealLogMutation,
  updateMealLogEntry,
};
