import '../../week-screen.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createWeekScreen } = readLegacyNamespace(
  globalThis,
  'WeekScreenModule',
  ['createWeekScreen'],
);

export { createWeekScreen };
