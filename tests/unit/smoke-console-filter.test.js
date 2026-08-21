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
