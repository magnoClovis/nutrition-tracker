import '../../i18n.js';
import { readLegacyNamespace } from './read-legacy-namespace.js';

const { createI18n } = readLegacyNamespace(globalThis, 'I18n', ['createI18n']);

export { createI18n };
