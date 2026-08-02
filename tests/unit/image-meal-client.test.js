const test = require('node:test');
const assert = require('node:assert/strict');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../image-meal-client.js'))],
  ['ESM', () => import('../../src/leaf/image-meal-client.js')],
];

function contractTest(name, callback) {
  implementations.forEach(([format, load]) => {
    test(`${format}: ${name}`, async () => callback(await load()));
  });
}

function response(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: name => headers[name] || null },
    json: async () => body,
  };
}

contractTest('sends the exact authenticated image request with AbortSignal', async module => {
  const calls = [];
  const signal = { test: true };
  const estimate = { status: 'identified', items: [] };
  const client = module.createImageMealClient({
    getIdToken: async () => 'fresh-token',
    fetchRequest: async (...args) => {
      calls.push(args);
      return response(200, { estimate });
    },
  });

  assert.equal(await client.analyzeImageMeal({
    image: { mimeType: 'image/jpeg', data: '/9j/' },
    language: 'pt',
    signal,
  }), estimate);
  assert.deepEqual(calls, [[module.IMAGE_MEAL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer fresh-token',
    },
    body: JSON.stringify({
      image: { mimeType: 'image/jpeg', data: '/9j/' },
      language: 'pt',
    }),
    signal,
  }]]);
});

contractTest('rejects invalid input and an expired local session before fetch', async module => {
  let fetches = 0;
  const client = module.createImageMealClient({
    getIdToken: async () => '',
    fetchRequest: async () => { fetches += 1; },
  });

  await assert.rejects(
    client.analyzeImageMeal({ image: { mimeType: 'image/png', data: 'x' }, language: 'pt' }),
    error => error instanceof module.ImageMealClientError && error.code === 'invalid-photo',
  );
  await assert.rejects(
    client.analyzeImageMeal({ image: { mimeType: 'image/jpeg', data: '/9j/' }, language: 'en' }),
    error => error instanceof module.ImageMealClientError && error.code === 'session-expired',
  );
  assert.equal(fetches, 0);
});

contractTest('maps quota scope, retry time, session, invalid photo, and service failures', async module => {
  const cases = [
    [401, {}, {}, 'session-expired'],
    [400, {}, {}, 'invalid-photo'],
    [413, {}, {}, 'invalid-photo'],
    [503, {}, {}, 'service-unavailable'],
    [429, { error: { scope: 'image-user' } }, { 'Retry-After': '37' }, 'quota-reached'],
  ];
  for (const [status, body, headers, code] of cases) {
    const client = module.createImageMealClient({
      getIdToken: async () => 'token',
      fetchRequest: async () => response(status, body, headers),
    });
    await assert.rejects(
      client.analyzeImageMeal({ image: { mimeType: 'image/jpeg', data: '/9j/' }, language: 'es' }),
      error => {
        assert.equal(error.code, code);
        if (status === 429) {
          assert.equal(error.retryAfterSeconds, 37);
          assert.equal(error.scope, 'image-user');
        }
        return true;
      },
    );
  }
});

contractTest('distinguishes invalid JSON and invalid response shape', async module => {
  const responses = [
    { ok: true, status: 200, headers: { get: () => null }, json: async () => { throw new Error('bad json'); } },
    response(200, { estimate: null }),
    response(200, { estimate: [] }),
  ];
  for (const nextResponse of responses) {
    const client = module.createImageMealClient({
      getIdToken: async () => 'token',
      fetchRequest: async () => nextResponse,
    });
    await assert.rejects(
      client.analyzeImageMeal({ image: { mimeType: 'image/jpeg', data: '/9j/' }, language: 'pt' }),
      error => error.code === 'invalid-response',
    );
  }
});

contractTest('preserves deliberate cancellation and sanitizes other network failures', async module => {
  for (const error of [
    Object.assign(new Error('cancelled'), { name: 'AbortError' }),
    new Error('private network detail'),
  ]) {
    const client = module.createImageMealClient({
      getIdToken: async () => 'token',
      fetchRequest: async () => { throw error; },
    });
    if (error.name === 'AbortError') {
      await assert.rejects(
        client.analyzeImageMeal({ image: { mimeType: 'image/jpeg', data: '/9j/' }, language: 'pt' }),
        value => value === error,
      );
    } else {
      await assert.rejects(
        client.analyzeImageMeal({ image: { mimeType: 'image/jpeg', data: '/9j/' }, language: 'pt' }),
        value => value.code === 'service-unavailable' && value.message !== 'private network detail',
      );
    }
  }
});
