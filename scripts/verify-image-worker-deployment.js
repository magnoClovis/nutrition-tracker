'use strict';

const DEFAULT_WORKER_URL = 'https://trofia-ai-proxy.cmagno-dev.workers.dev/v1/ai/image-meal';
const ALLOWED_ORIGIN = 'https://localhost';
const BLOCKED_ORIGIN = 'https://example.com';

async function readJson(response, label) {
  const contentType = response.headers.get('content-type') || '';
  if (!/application\/json/i.test(contentType)) {
    throw new Error(`${label} returned unexpected Content-Type: ${contentType || '(missing)'}`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
}

function assertStatus(response, expected, label) {
  if (response.status !== expected) {
    throw new Error(`${label} returned HTTP ${response.status}; expected ${expected}`);
  }
}

async function verifyImageWorkerDeployment(
  workerUrl = DEFAULT_WORKER_URL,
  { fetchRequest = globalThis.fetch } = {},
) {
  if (typeof fetchRequest !== 'function') throw new Error('fetchRequest is required');
  const endpoint = new URL(workerUrl).href;

  const preflight = await fetchRequest(endpoint, {
    method: 'OPTIONS',
    headers: {
      Origin: ALLOWED_ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, content-type',
    },
    cache: 'no-store',
  });
  assertStatus(preflight, 204, 'allowed CORS preflight');
  if (preflight.headers.get('access-control-allow-origin') !== ALLOWED_ORIGIN) {
    throw new Error('allowed CORS preflight did not echo the Capacitor origin');
  }
  if (!/\bPOST\b/i.test(preflight.headers.get('access-control-allow-methods') || '')) {
    throw new Error('allowed CORS preflight is missing POST');
  }
  const allowedHeaders = preflight.headers.get('access-control-allow-headers') || '';
  if (!/authorization/i.test(allowedHeaders) || !/content-type/i.test(allowedHeaders)) {
    throw new Error('allowed CORS preflight is missing required request headers');
  }

  const blocked = await fetchRequest(endpoint, {
    method: 'OPTIONS',
    headers: {
      Origin: BLOCKED_ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, content-type',
    },
    cache: 'no-store',
  });
  assertStatus(blocked, 403, 'blocked CORS preflight');
  const blockedBody = await readJson(blocked, 'blocked CORS preflight');
  if (blockedBody?.error?.code !== 'origin-not-allowed') {
    throw new Error('blocked CORS preflight returned an unexpected public error');
  }

  const unauthenticated = await fetchRequest(endpoint, {
    method: 'POST',
    headers: {
      Origin: ALLOWED_ORIGIN,
      'Content-Type': 'application/json',
    },
    body: '{}',
    cache: 'no-store',
  });
  assertStatus(unauthenticated, 401, 'unauthenticated image request');
  if (unauthenticated.headers.get('access-control-allow-origin') !== ALLOWED_ORIGIN) {
    throw new Error('unauthenticated response is missing the Capacitor CORS origin');
  }
  const unauthenticatedBody = await readJson(unauthenticated, 'unauthenticated image request');
  if (unauthenticatedBody?.error?.code !== 'invalid-authentication') {
    throw new Error('unauthenticated image request returned an unexpected public error');
  }

  return { endpoint, origin: ALLOWED_ORIGIN };
}

if (require.main === module) {
  verifyImageWorkerDeployment(process.argv[2] || process.env.TROFIA_IMAGE_WORKER_URL)
    .then(result => console.log(`Verified image Worker deployment: ${result.endpoint}`))
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  ALLOWED_ORIGIN,
  BLOCKED_ORIGIN,
  DEFAULT_WORKER_URL,
  verifyImageWorkerDeployment,
};
