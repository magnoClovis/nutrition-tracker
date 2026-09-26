'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const {
  ALLOWED_ORIGIN,
  DEFAULT_WORKER_URL,
  verifyAIWorkerAppCheckMode,
} = require('../../scripts/verify-ai-worker-app-check-mode.js');

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fixtureForProbe(probeResponse) {
  const requests = [];
  const fetchRequest = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).includes(':signUp')) {
      return jsonResponse(200, { idToken: 'disposable-id-token' });
    }
    if (String(url).includes(':delete')) return jsonResponse(200, {});
    return probeResponse;
  };
  return { fetchRequest, requests };
}

for (const [mode, status, code] of [
  ['observe', 400, 'invalid-request'],
  ['enforce', 401, 'app-check-required'],
]) {
  test(`proves the deployed Worker is in ${mode} mode without invoking Gemini`, async () => {
    const fixture = fixtureForProbe(jsonResponse(status, { error: { code } }));
    const result = await verifyAIWorkerAppCheckMode({
      expectedMode: mode,
      fetchRequest: fixture.fetchRequest,
      firebaseApiKey: 'public-web-api-key',
      nonce: () => 'deterministic',
    });

    assert.deepEqual(result, { mode, status, code });
    assert.equal(fixture.requests.length, 3);
    const workerRequest = fixture.requests[1];
    assert.equal(workerRequest.url, DEFAULT_WORKER_URL);
    assert.equal(workerRequest.options.headers.Origin, ALLOWED_ORIGIN);
    assert.equal(workerRequest.options.headers['X-Firebase-AppCheck'], undefined);
    assert.equal(workerRequest.options.body, '{}');
    assert.equal(fixture.requests[2].url.includes(':delete'), true);
  });
}

test('fails closed on a response that does not prove the requested mode and still cleans up', async () => {
  const fixture = fixtureForProbe(jsonResponse(400, { error: { code: 'invalid-request' } }));

  await assert.rejects(
    verifyAIWorkerAppCheckMode({
      expectedMode: 'enforce',
      fetchRequest: fixture.fetchRequest,
      firebaseApiKey: 'public-web-api-key',
      nonce: () => 'deterministic',
    }),
    /expected HTTP 401\/app-check-required/,
  );
  assert.equal(fixture.requests.at(-1).url.includes(':delete'), true);
});

test('rejects unsupported expectations before creating an account', async () => {
  let called = false;
  await assert.rejects(
    verifyAIWorkerAppCheckMode({
      expectedMode: 'unknown',
      fetchRequest: async () => {
        called = true;
        throw new Error('must not run');
      },
    }),
    /expected mode must be observe or enforce/,
  );
  assert.equal(called, false);
});

test('keeps the production gate on enforce for pull requests and explicit for dispatch', () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, '..', '..', '.github', 'workflows', 'c14-c5-app-check-gate.yml'),
    'utf8',
  );
  assert.match(workflow, /github\.event_name == 'pull_request' && 'enforce' \|\| inputs\.expected_mode/);
  assert.match(workflow, /node scripts\/verify-ai-worker-app-check-mode\.js "\$EXPECTED_MODE"/);
  assert.doesNotMatch(workflow, /wrangler\s+deploy|wrangler\s+rollback/i);
});
