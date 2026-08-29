import '../../daily-entry-model.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const {
  createIdempotentEntryId,
  ensureEntryId,
  ensureEntryIds,
  applyEntryListMutation,
  applyMealLogMutation,
} = readLegacyNamespace(globalThis, 'DailyEntryModel', [
  'createIdempotentEntryId',
  'ensureEntryId',
  'ensureEntryIds',
  'applyEntryListMutation',
  'applyMealLogMutation',
]);

export {
  createIdempotentEntryId,
  ensureEntryId,
  ensureEntryIds,
  applyEntryListMutation,
  applyMealLogMutation,
};
