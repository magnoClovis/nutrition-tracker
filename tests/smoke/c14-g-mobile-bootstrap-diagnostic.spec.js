const { test, expect } = require('./app-check-fixture');

const KNOWN_HOSTS = new Set([
  '127.0.0.1', 'localhost', 'www.google.com', 'apis.google.com',
  'firestore.googleapis.com', 'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com', 'firebaseappcheck.googleapis.com',
  'content-firebaseappcheck.googleapis.com', 'firebaseinstallations.googleapis.com',
]);

function safeHost(raw) {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return KNOWN_HOSTS.has(host) ? host : 'external-host';
  } catch {
    return 'unknown';
  }
}

function safeGoogleScriptPath(raw) {
  try {
    const url = new URL(raw);
    if (url.hostname !== 'apis.google.com') return 'not-google-api';
    if (url.pathname === '/js/api.js') return 'api-js';
    if (url.pathname.startsWith('/_/scs/')) return 'google-static-bundle';
    return 'other-google-api-path';
  } catch {
    return 'unknown';
  }
}

test('diagnoses mobile bootstrap without recording private network data', async ({ page }) => {
  const events = [];
  const record = (entry) => {
    if (events.length < 60) events.push(entry);
  };
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const value = message.text();
    record({ source: 'console', kind: /Content Security Policy|Refused to/i.test(value)
      ? 'csp' : /app.check/i.test(value) ? 'app-check' : 'other', host: safeHost(message.location().url) });
  });
  page.on('pageerror', (error) => {
    record({ source: 'pageerror', kind: ['Error', 'TypeError', 'ReferenceError'].includes(error.name)
      ? error.name : 'other' });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      record({ source: 'response', host: safeHost(response.url()), status: response.status(),
        method: response.request().method() });
    }
  });
  page.on('requestfailed', (request) => {
    const code = /net::ERR_[A-Z_]+/.exec(request.failure()?.errorText || '');
    record({ source: 'requestfailed', host: safeHost(request.url()),
      pathClass: safeGoogleScriptPath(request.url()), kind: code?.[0] || 'other' });
  });
  await page.addInitScript(() => {
    window.__trofiaCspDiagnostic = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      let host = 'unknown';
      let pathClass = 'unknown';
      try {
        const blocked = new URL(event.blockedURI);
        host = blocked.hostname.toLowerCase();
        if (host === 'apis.google.com') {
          if (blocked.pathname === '/js/api.js') pathClass = 'api-js';
          else if (blocked.pathname.startsWith('/_/scs/')) pathClass = 'google-static-bundle';
          else pathClass = 'other-google-api-path';
        }
      } catch { /* inline */ }
      const known = [
        '127.0.0.1', 'localhost', 'www.google.com', 'apis.google.com',
        'firestore.googleapis.com', 'identitytoolkit.googleapis.com',
        'securetoken.googleapis.com', 'firebaseappcheck.googleapis.com',
        'content-firebaseappcheck.googleapis.com', 'firebaseinstallations.googleapis.com',
      ];
      window.__trofiaCspDiagnostic.push({ directive: event.effectiveDirective,
        host: known.includes(host) ? host : 'external-host', pathClass });
    });
  });
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  let settled = true;
  try {
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
  } catch {
    settled = false;
  }
  const violations = await page.evaluate(() => window.__trofiaCspDiagnostic || []);
  expect(settled, `mobile-bootstrap-diagnostic:${JSON.stringify({ events, violations })}`).toBe(true);
  expect(violations, `mobile-bootstrap-csp:${JSON.stringify({ events, violations })}`).toEqual([]);
});
