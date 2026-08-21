import { Capacitor, registerPlugin } from '@capacitor/core';
import '../../app-check-client.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createAppCheckClient } = readLegacyNamespace(
  globalThis,
  'AppCheckClient',
  ['createAppCheckClient'],
);
const FirebaseAppCheck = registerPlugin('FirebaseAppCheck');

const client = createAppCheckClient({
  getPlugin: () => FirebaseAppCheck,
  isNativePlatform: () => Capacitor.isNativePlatform(),
});

const initializeAppCheck = () => client.initialize();
const getAppCheckToken = () => client.getToken();

export { getAppCheckToken, initializeAppCheck };
