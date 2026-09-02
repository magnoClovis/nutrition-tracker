import '../../selection-controls.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createSelectionControls } = readLegacyNamespace(
  globalThis,
  'SelectionControlsModule',
  ['createSelectionControls'],
);

export { createSelectionControls };
