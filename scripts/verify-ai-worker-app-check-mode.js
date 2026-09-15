'use strict';

const { randomBytes } = require('node:crypto');
const FirebaseConfigInternal = require('../firebase-config-internal.js');

const DEFAULT_WORKER_URL =
  'https://trofia-ai-proxy.cmagno-dev.workers.dev/v1/ai/completion';
const ALLOWED_ORIGIN = 'https://magnoclovis.github.io';
const EXPECTED_RESPONSES = Object.freeze({
  observe: Object.freeze({ status: 400, code: 'invalid-request' }),
  enforce: Object.freeze({ status: 401, code: 'app-check-required' }),
});

function assertExpectedMode(mode) {
  if (!Object.hasOwn(EXPECTED_RESPONSES, mode)) {
    throw new Error('expected mode must be observe or enforce');
  }
}

async function readJson(response, label) {
  const contentType = response.headers.get('content-type') || '';
  if (!/application\/json/i.test(contentType)) {
    throw new Error(`${label} returned unexpected content type`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
}

async function fetchOrFail(fetchRequest, url, options, label) {
  try {
    return await fetchRequest(url, options);
  } catch (error) {
    throw new Error(`${label} could not reach its endpoint`, { cause: error });
  }
}

async function verifyAIWorkerAppCheckMode({
  expectedMode,
  workerUrl = DEFAULT_WORKER_URL,
  fetchRequest = globalThis.fetch,
  firebaseApiKey = FirebaseConfigInternal.createFirebaseConfig().FB_KEY,
  nonce = () => `${Date.now()}-${randomBytes(6).toString('hex')}`,
} = {}) {
  assertExpectedMode(expectedMode);
  if (typeof fetchRequest !== 'function') throw new Error('fetchRequest is required');
  if (typeof firebaseApiKey !== 'string' || !firebaseApiKey) {
    throw new Error('Firebase Web API key is required');
  }

  const authBase = 'https://identitytoolkit.googleapis.com/v1/accounts';
  const marker = nonce();
  const credentials = {
    email: `c14-c5-${marker}@example.com`,
    password: `C14-c5-${randomBytes(18).toString('base64url')}!`,
    returnSecureToken: true,
  };
  let idToken = '';
  let primaryError = null;

  try {
    const signup = await fetchOrFail(fetchRequest, `${authBase}:signUp?key=${firebaseApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    }, 'disposable signup');
    const signupBody = await readJson(signup, 'disposable signup');
    idToken = typeof signupBody.idToken === 'string' ? signupBody.idToken : '';
    if (!signup.ok || !idToken) throw new Error('disposable signup failed');

    const response = await fetchOrFail(fetchRequest, new URL(workerUrl).href, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
        Origin: ALLOWED_ORIGIN,
      },
      body: '{}',
      cache: 'no-store',
    }, 'App Check mode probe');
    const body = await readJson(response, 'App Check mode probe');
    const expected = EXPECTED_RESPONSES[expectedMode];
    if (response.status !== expected.status || body?.error?.code !== expected.code) {
      throw new Error(
        `App Check mode probe returned HTTP ${response.status}/${body?.error?.code || 'unknown'}; ` +
        `expected HTTP ${expected.status}/${expected.code}`,
      );
    }

    return {
      mode: expectedMode,
      status: response.status,
      code: body.error.code,
    };
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    if (idToken) {
      const cleanup = await fetchOrFail(fetchRequest, `${authBase}:delete?key=${firebaseApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }, 'disposable account cleanup');
      if (!cleanup.ok && !primaryError) throw new Error('disposable account cleanup failed');
    }
  }
}

if (require.main === module) {
  const expectedMode = String(process.argv[2] || '').trim();
  verifyAIWorkerAppCheckMode({ expectedMode })
    .then(result => {
      console.log(`App Check mode verified: ${result.mode} (${result.status}/${result.code})`);
    })
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  ALLOWED_ORIGIN,
  DEFAULT_WORKER_URL,
  EXPECTED_RESPONSES,
  verifyAIWorkerAppCheckMode,
};
