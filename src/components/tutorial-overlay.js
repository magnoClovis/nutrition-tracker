import '../../tutorial-overlay.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createTutorialOverlay } = readLegacyNamespace(
  globalThis,
  'TutorialOverlay',
  ['createTutorialOverlay'],
);

export { createTutorialOverlay };
