'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  verifyPagesDeployment,
} = require('../../scripts/verify-pages-deployment.js');

function response(body, contentType, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type' ? contentType : null;
      },
    },
    async text() {
      return body;
    },
  };
}

const validPrivacyHtml = [
  '<nav data-language-selector></nav>',
  '<article data-policy="pt"></article>',
  '<article data-policy="en"></article>',
  '<article data-policy="es"></article>',
].join('');

function createFetch(indexHtml, overrides = {}) {
  return async requestedUrl => {
    const url = String(requestedUrl);
    if (url.endsWith('/nutrition-tracker/')) {
      return response(indexHtml, 'text/html; charset=utf-8');
    }
    if (url.endsWith('/nutrition-tracker/privacy/')) {
      return overrides.privacy || response(validPrivacyHtml, 'text/html; charset=utf-8');
    }
    if (url.endsWith('.js')) {
      return overrides.script || response('', 'text/javascript; charset=utf-8');
    }
    if (url.endsWith('.css')) {
      return overrides.style || response('', 'text/css; charset=utf-8');
    }
    return response('', 'text/plain', 404);
  };
}

const validHtml = [
  '<script type="module" crossorigin src="./assets/index-AbC123.js"></script>',
  '<link rel="stylesheet" crossorigin href="./assets/index-DeF456.css">',
].join('');

test('accepts a deployed relative hashed bundle with correct MIME types', async () => {
  const result = await verifyPagesDeployment(
    'https://example.test/nutrition-tracker/index.html',
    { fetchRequest: createFetch(validHtml), attempts: 1, delayMs: 0 },
  );

  assert.deepEqual(result, {
    pageUrl: 'https://example.test/nutrition-tracker/',
    scriptUrl: 'https://example.test/nutrition-tracker/assets/index-AbC123.js',
    styleUrl: 'https://example.test/nutrition-tracker/assets/index-DeF456.css',
    privacyUrl: 'https://example.test/nutrition-tracker/privacy/',
  });
});

test('rejects a deployed privacy page without all three synchronized language documents', async () => {
  await assert.rejects(
    verifyPagesDeployment(
      'https://example.test/nutrition-tracker/',
      {
        fetchRequest: createFetch(validHtml, {
          privacy: response('<nav data-language-selector></nav><article data-policy="pt"></article>', 'text/html'),
        }),
        attempts: 1,
        delayMs: 0,
      },
    ),
    /privacy page is missing the EN policy/,
  );
});

test('rejects source entries, legacy runtimes, and manual cache busting', async t => {
  const cases = [
    [`${validHtml}<script type="module" src="/src/main.jsx"></script>`, /source Vite entry detected/],
    [`${validHtml}<script src="./app.js"></script>`, /legacy runtime reference detected/],
    [validHtml.replace('.js"', '.js?v=1"'), /manual cache-busting query detected/],
  ];

  for (const [html, expectedError] of cases) {
    await t.test(String(expectedError), async () => {
      await assert.rejects(
        verifyPagesDeployment(
          'https://example.test/nutrition-tracker/',
          { fetchRequest: createFetch(html), attempts: 1, delayMs: 0 },
        ),
        expectedError,
      );
    });
  }
});

test('rejects missing hashes and incorrect asset MIME types', async t => {
  await t.test('missing hashes', async () => {
    const html = validHtml.replace('index-AbC123.js', 'index.js');
    await assert.rejects(
      verifyPagesDeployment(
        'https://example.test/nutrition-tracker/',
        { fetchRequest: createFetch(html), attempts: 1, delayMs: 0 },
      ),
      /missing a relative hashed JavaScript asset/,
    );
  });

  await t.test('incorrect JavaScript MIME', async () => {
    await assert.rejects(
      verifyPagesDeployment(
        'https://example.test/nutrition-tracker/',
        {
          fetchRequest: createFetch(validHtml, {
            script: response('', 'text/plain'),
          }),
          attempts: 1,
          delayMs: 0,
        },
      ),
      /unexpected Content-Type: text\/plain/,
    );
  });
});
