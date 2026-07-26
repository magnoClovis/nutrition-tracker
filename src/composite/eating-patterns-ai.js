import '../../eating-patterns-ai.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createEatingPatternsAI } = readLegacyNamespace(
  globalThis,
  'EatingPatternsAI',
  ['createEatingPatternsAI'],
);

export { createEatingPatternsAI };
