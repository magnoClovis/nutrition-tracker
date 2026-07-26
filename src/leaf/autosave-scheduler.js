import '../../autosave-scheduler.js';
import { readLegacyNamespace } from './read-legacy-namespace.js';

const { createAutosaveScheduler } = readLegacyNamespace(globalThis, 'AutosaveScheduler', [
  'createAutosaveScheduler',
]);

export { createAutosaveScheduler };
