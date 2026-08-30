const { createFirebaseConfig } = require('../../firebase-config-internal.js');

const FIRESTORE_ORIGIN = 'https://firestore.googleapis.com';

function readCiAppCheckConfig(env = process.env) {
  const debugToken = String(env.FIREBASE_APPCHECK_DEBUG_TOKEN || '').trim();
  const appId = String(env.VITE_FIREBASE_WEB_APP_ID || '').trim();
  return { debugToken, appId };
}

async function exchangeDebugToken({ debugToken, appId, fetchRequest = globalThis.fetch }) {
  if (!debugToken || !appId || typeof fetchRequest !== 'function') {
    throw new Error('app-check-ci-configuration-invalid');
  }

  const appIdMatch = /^1:(\d+):(web|android|ios):/.exec(appId);
  if (!appIdMatch) throw new Error('app-check-ci-app-id-invalid');

  const { FB_KEY } = createFirebaseConfig();
  const projectNumber = appIdMatch[1];
  const endpoint = `https://firebaseappcheck.googleapis.com/v1/projects/${projectNumber}/apps/${encodeURIComponent(appId)}:exchangeDebugToken?key=${encodeURIComponent(FB_KEY)}`;
  const response = await fetchRequest(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ debugToken, limitedUse: false }),
  });

  if (!response?.ok) throw new Error('app-check-ci-exchange-failed');
  const payload = await response.json();
  if (!payload || typeof payload.token !== 'string' || !payload.token.trim()) {
    throw new Error('app-check-ci-response-invalid');
  }

  return payload.token.trim();
}

function installCiAppCheck(debugToken) {
  globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
}

function buildFirestoreHeaders(headers, appCheckToken) {
  const result = { ...headers };
  const existingName = Object.keys(result).find((name) => name.toLowerCase() === 'x-firebase-appcheck');
  if (!existingName) result['X-Firebase-AppCheck'] = appCheckToken;
  return result;
}

module.exports = {
  FIRESTORE_ORIGIN,
  buildFirestoreHeaders,
  exchangeDebugToken,
  installCiAppCheck,
  readCiAppCheckConfig,
};
