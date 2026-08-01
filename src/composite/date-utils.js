import '../../date-utils.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const {
  createDateUtils,
  localToday,
  addCivilDays,
  differenceInCivilDays,
  lastCivilDayOfMonth,
} = readLegacyNamespace(globalThis, 'DateUtils', [
  'createDateUtils',
  'localToday',
  'addCivilDays',
  'differenceInCivilDays',
  'lastCivilDayOfMonth',
]);

export {
  createDateUtils,
  localToday,
  addCivilDays,
  differenceInCivilDays,
  lastCivilDayOfMonth,
};
