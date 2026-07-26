import '../../app-header-navigation.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createAppHeaderNavigation } = readLegacyNamespace(
  globalThis,
  'AppHeaderNavigationModule',
  ['createAppHeaderNavigation'],
);

export { createAppHeaderNavigation };
