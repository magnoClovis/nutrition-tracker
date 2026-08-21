import { Capacitor, registerPlugin } from '@capacitor/core';
import { getApps, initializeApp } from 'firebase/app';
import {
  getToken as getFirebaseAppCheckToken,
  initializeAppCheck as initializeFirebaseAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'firebase/app-check';
import '../../app-check-client.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';
import { createFirebaseConfig } from '../leaf/firebase-config-internal.js';

const { createAppCheckClient } = readLegacyNamespace(
  globalThis,
  'AppCheckClient',
  ['createAppCheckClient'],
);
const FirebaseAppCheck = registerPlugin('FirebaseAppCheck');
const WEB_APP_NAME = 'trofia-web-app-check';
let webAppCheck = null;

function readRequiredWebConfig() {
  const appId = import.meta.env?.VITE_FIREBASE_WEB_APP_ID?.trim();
  const siteKey = import.meta.env?.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY?.trim();
  if (!appId || !siteKey) {
    const error = new Error('app-check-web-not-configured');
    error.code = 'app-check-web-not-configured';
    throw error;
  }
  return {appId, siteKey};
}

function initializeWeb() {
  if (webAppCheck) return;
  const {FB_KEY: apiKey, FB_PROJECT: projectId} = createFirebaseConfig();
  const {appId, siteKey} = readRequiredWebConfig();
  const existingApp = getApps().find(app => app.name === WEB_APP_NAME);
  const firebaseApp = existingApp || initializeApp({
    apiKey,
    appId,
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
  }, WEB_APP_NAME);
  webAppCheck = initializeFirebaseAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

async function getWebToken() {
  if (!webAppCheck) initializeWeb();
  const result = await getFirebaseAppCheckToken(webAppCheck, false);
  return result?.token;
}

const client = createAppCheckClient({
  getPlugin: () => FirebaseAppCheck,
  isNativePlatform: () => Capacitor.isNativePlatform(),
  initializeWeb,
  getWebToken,
});

const initializeAppCheck = () => client.initialize();
const getAppCheckToken = () => client.getToken();

export { getAppCheckToken, initializeAppCheck, readRequiredWebConfig };
