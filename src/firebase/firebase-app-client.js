import { getApps, initializeApp } from 'firebase/app';
import '../../firebase-app-client.js';
import { createFirebaseConfig } from '../leaf/firebase-config-internal.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';

const { createFirebaseAppClient } = readLegacyNamespace(
  globalThis,
  'FirebaseAppClient',
  ['createFirebaseAppClient'],
);

function readRequiredFirebaseAppId() {
  const appId = import.meta.env?.VITE_FIREBASE_WEB_APP_ID?.trim();
  if (!appId) {
    const error = new Error('firebase-web-app-not-configured');
    error.code = 'firebase-web-app-not-configured';
    throw error;
  }
  return appId;
}

const client = createFirebaseAppClient({
  getApps,
  initializeApp,
  getConfig: createFirebaseConfig,
  getAppId: readRequiredFirebaseAppId,
});

const getSharedFirebaseApp = () => client.getApp();

export { getSharedFirebaseApp, readRequiredFirebaseAppId };
