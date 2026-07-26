import '../../week-aggregator.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createWeekAggregator } = readLegacyNamespace(
  globalThis,
  'WeekAggregator',
  ['createWeekAggregator'],
);

export { createWeekAggregator };
