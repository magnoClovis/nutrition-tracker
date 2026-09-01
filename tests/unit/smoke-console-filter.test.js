const assert = require('node:assert/strict');
const test = require('node:test');

const { isIgnorableConsoleError } = require('../smoke/test-helpers');

test('ignores only the known reCAPTCHA Enterprise report-only frame warning', () => {
  const reportOnlyWarning = 'Framing \'https://www.google.com/\' violates the following report-only Content Security Policy directive: "frame-ancestors \'self\'". The violation has been logged, but no further action has been taken.';

  assert.equal(isIgnorableConsoleError(reportOnlyWarning), true);
  assert.equal(
    isIgnorableConsoleError('Refused to frame \'https://www.google.com/\' because it violates the following Content Security Policy directive: "frame-src \'self\'".'),
    false
  );
  assert.equal(isIgnorableConsoleError('Uncaught TypeError: failed to initialize App Check'), false);
});

test('ignores only the expected headless reCAPTCHA and App Check exchange errors', () => {
  const storageAccessError = 'requestStorageAccess: Permission denied.';
  const appCheck403 = 'Failed to load resource: the server responded with a status of 403 ()';

  assert.equal(isIgnorableConsoleError(
    storageAccessError,
    'https://www.google.com/recaptcha/enterprise/anchor?ar=1&k=public-site-key'
  ), true);
  assert.equal(isIgnorableConsoleError(storageAccessError, 'https://example.com/'), false);

  assert.equal(isIgnorableConsoleError(
    appCheck403,
    'https://content-firebaseappcheck.googleapis.com/v1/projects/example/apps/1:123:web:abc:exchangeRecaptchaEnterpriseToken?key=public-api-key'
  ), true);
  assert.equal(isIgnorableConsoleError(
    appCheck403,
    'https://content-firebaseappcheck.googleapis.com/v1/projects/example/apps/1:123:web:abc:otherOperation?key=public-api-key'
  ), false);
  assert.equal(isIgnorableConsoleError(appCheck403, 'https://example.com/api'), false);
});
