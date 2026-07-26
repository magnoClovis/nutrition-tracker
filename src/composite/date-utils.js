import '../../date-utils.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createDateUtils } = readLegacyNamespace(globalThis, 'DateUtils', ['createDateUtils']);

export { createDateUtils };
