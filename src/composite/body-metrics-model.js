import '../../body-metrics-model.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createBodyMetricsModel } = readLegacyNamespace(
  globalThis,
  'BodyMetricsModel',
  ['createBodyMetricsModel'],
);

export { createBodyMetricsModel };
