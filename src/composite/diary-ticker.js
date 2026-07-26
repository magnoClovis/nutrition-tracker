import '../../diary-ticker.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createDiaryTicker } = readLegacyNamespace(globalThis, 'DiaryTicker', ['createDiaryTicker']);

export { createDiaryTicker };
