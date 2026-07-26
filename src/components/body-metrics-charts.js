import '../../body-metrics-charts.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createBodyMetricsCharts } = readLegacyNamespace(
  globalThis,
  'BodyMetricsCharts',
  ['createBodyMetricsCharts'],
);

export { createBodyMetricsCharts };
