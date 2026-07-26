import '../../settings-panel.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createSettingsPanel } = readLegacyNamespace(
  globalThis,
  'SettingsPanelModule',
  ['createSettingsPanel'],
);

export { createSettingsPanel };
