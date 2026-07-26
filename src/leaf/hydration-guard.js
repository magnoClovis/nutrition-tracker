import '../../hydration-guard.js';
import { readLegacyNamespace } from './read-legacy-namespace.js';

const { canPersistHydratedKey } = readLegacyNamespace(globalThis, 'HydrationGuard', [
  'canPersistHydratedKey',
]);

export { canPersistHydratedKey };
