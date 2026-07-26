import '../../calendar-model.js';
import { readLegacyNamespace } from './read-legacy-namespace.js';

const { createCalendarModel } = readLegacyNamespace(globalThis, 'CalendarModel', [
  'createCalendarModel',
]);

export { createCalendarModel };
