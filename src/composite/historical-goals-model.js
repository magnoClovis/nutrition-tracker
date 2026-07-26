import '../../historical-goals-model.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createHistoricalGoalsModel } = readLegacyNamespace(
  globalThis,
  'HistoricalGoalsModel',
  ['createHistoricalGoalsModel'],
);

export { createHistoricalGoalsModel };
