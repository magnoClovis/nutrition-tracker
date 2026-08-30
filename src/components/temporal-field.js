import '../../temporal-field.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createTemporalField } = readLegacyNamespace(
  globalThis,
  'TemporalFieldModule',
  ['createTemporalField'],
);

export { createTemporalField };
