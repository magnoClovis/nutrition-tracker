import '../../ui-primitives.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createUiPrimitives } = readLegacyNamespace(
  globalThis,
  'UiPrimitives',
  ['createUiPrimitives'],
);

export { createUiPrimitives };
