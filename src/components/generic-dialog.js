import '../../generic-dialog.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createGenericDialog } = readLegacyNamespace(
  globalThis,
  'GenericDialogModule',
  ['createGenericDialog'],
);

export { createGenericDialog };
