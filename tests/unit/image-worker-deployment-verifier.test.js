'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  ALLOWED_ORIGIN,
  BLOCKED_ORIGIN,
  DEFAULT_WORKER_URL,
  verifyImageWorkerDeployment,
} = require('../../scripts/verify-image-worker-deployment.js');

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

test('verifies CORS and authentication gates without sending a photo', async () => {
  const requests = [];
  const result = await verifyImageWorkerDeployment(undefined, {
    fetchRequest: async (url, options) => {
      requests.push({ url, options });
      if (options.method === 'OPTIONS' && options.headers.Origin === ALLOWED_ORIGIN) {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          },
        });
      }
      if (options.method === 'OPTIONS' && options.headers.Origin === BLOCKED_ORIGIN) {
        return jsonResponse(403, { error: { code: 'origin-not-allowed' } });
      }
      return jsonResponse(
        401,
        { error: { code: 'invalid-authentication' } },
        { 'Access-Control-Allow-Origin': ALLOWED_ORIGIN },
      );
    },
  });

  assert.deepEqual(result, { endpoint: DEFAULT_WORKER_URL, origin: ALLOWED_ORIGIN });
  assert.equal(requests.length, 3);
  assert.equal(requests[2].options.body, '{}');
  assert.equal(requests[2].options.headers.Authorization, undefined);
  assert.doesNotMatch(requests.map(request => request.options.body || '').join(''), /image|base64/i);
});

test('fails closed when the deployed public contract changes', async () => {
  await assert.rejects(
    verifyImageWorkerDeployment(undefined, {
      fetchRequest: async () => jsonResponse(200, { ok: true }),
    }),
    /expected 204/,
  );
});
