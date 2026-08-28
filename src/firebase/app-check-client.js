import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  CustomProvider,
  getToken as getFirebaseAppCheckToken,
  initializeAppCheck as initializeFirebaseAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'firebase/app-check';
import '../../app-check-client.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';
import { getSharedFirebaseApp } from './firebase-app-client.js';

const { createAppCheckClient, normalizeNativeAppCheckToken } = readLegacyNamespace(
  globalThis,
  'AppCheckClient',
  ['createAppCheckClient', 'normalizeNativeAppCheckToken'],
);
const FirebaseAppCheck = registerPlugin('FirebaseAppCheck');
let sharedAppCheck = null;

function readRequiredWebConfig() {
  const siteKey = import.meta.env?.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY?.trim();
  if (!siteKey) {
    const error = new Error('app-check-web-not-configured');
    error.code = 'app-check-web-not-configured';
    throw error;
  }
  return {siteKey};
}

function initializeWeb() {
  if (sharedAppCheck) return;
  const {siteKey} = readRequiredWebConfig();
  sharedAppCheck = initializeFirebaseAppCheck(getSharedFirebaseApp(), {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

async function readNativeToken() {
  const result = await FirebaseAppCheck.getToken({forceRefresh: false});
  return normalizeNativeAppCheckToken(result);
}

async function initializeNativeBridge() {
  if (sharedAppCheck) return;
  await FirebaseAppCheck.initialize({isTokenAutoRefreshEnabled: true});
  sharedAppCheck = initializeFirebaseAppCheck(getSharedFirebaseApp(), {
    provider: new CustomProvider({getToken: readNativeToken}),
    isTokenAutoRefreshEnabled: true,
  });
}

async function getSdkToken() {
  const result = await getFirebaseAppCheckToken(sharedAppCheck, false);
  return result;
}

const client = createAppCheckClient({
  isNativePlatform: () => Capacitor.isNativePlatform(),
  initializeWeb,
  initializeNativeBridge,
  getSdkToken,
});

const initializeAppCheck = () => client.initialize();
const getAppCheckToken = () => client.getToken();

export { getAppCheckToken, initializeAppCheck, readRequiredWebConfig };
