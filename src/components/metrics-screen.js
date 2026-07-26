import '../../metrics-screen.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createMetricsScreen } = readLegacyNamespace(
  globalThis,
  'MetricsScreenModule',
  ['createMetricsScreen'],
);

export { createMetricsScreen };
