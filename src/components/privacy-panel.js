import '../../privacy-panel.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createPrivacyPanel } = readLegacyNamespace(
  globalThis,
  'PrivacyPanelModule',
  ['createPrivacyPanel'],
);

export { createPrivacyPanel };
