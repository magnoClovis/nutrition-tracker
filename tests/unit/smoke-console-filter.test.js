const assert = require('node:assert/strict');
const test = require('node:test');

const { EventEmitter } = require('node:events');
const {
  collectCriticalErrors,
  isIgnorableConsoleError,
  readSafeBootstrapState,
  restoreFixtureActions,
  safeResourceLocation,
  setCriticalErrorPhase
} = require('../smoke/test-helpers');

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

test('redacts variable URL segments, query, credentials and unknown hosts', () => {
  assert.deepEqual(safeResourceLocation('https://firestore.googleapis.com/v1/projects/private-project/databases/(default)/documents/users/private-uid?key=secret&email=person@example.com'), {
    domain: 'firestore.googleapis.com',
    path: '/v1/projects/:redacted/databases/(default)/documents/:redacted/:redacted'
  });
  assert.deepEqual(safeResourceLocation('https://private-uid.example.com/path/secret?token=secret'), {
    domain: 'external-host',
    path: '/:redacted/:redacted'
  });
});

test('records a critical HTTP 400 with safe network context and scenario phase', () => {
  const page = new EventEmitter();
  const errors = collectCriticalErrors(page);
  const url = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=secret&email=person@example.com';
  setCriticalErrorPhase(errors, 'backup-import');
  page.emit('response', {
    url: () => url,
    status: () => 400,
    request: () => ({ method: () => 'POST' })
  });
  page.emit('console', {
    type: () => 'error',
    text: () => 'Failed to load resource: the server responded with a status of 400 ()',
    location: () => ({ url })
  });
  assert.equal(isIgnorableConsoleError('Failed to load resource: the server responded with a status of 400 ()', url), false);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /phase=backup-import source=console kind=http-error domain=identitytoolkit\.googleapis\.com path=\/v1\/accounts:lookup method=POST status=400/);
  assert.match(errors.diagnostics[0], /source=response.*method=POST status=400/);
  assert.doesNotMatch(JSON.stringify([errors, errors.diagnostics]), /secret|person@|private-uid|key=/);
});

test('records page and request failures without raw messages or URLs', () => {
  const page = new EventEmitter();
  const errors = collectCriticalErrors(page);
  page.emit('requestfailed', {
    url: () => 'https://firestore.googleapis.com/v1/projects/p/documents/users/private-uid?token=secret',
    method: () => 'GET',
    failure: () => ({ errorText: 'net::ERR_CONNECTION_RESET private-uid token=secret' })
  });
  page.emit('pageerror', { name: 'TypeError', message: 'person@example.com secret token private-uid' });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /source=pageerror kind=TypeError/);
  assert.match(errors.diagnostics[0], /source=requestfailed kind=net::ERR_CONNECTION_RESET domain=firestore\.googleapis\.com/);
  assert.doesNotMatch(JSON.stringify([errors, errors.diagnostics]), /secret|person@|private-uid|token=/);
});

test('labels only the controlled export fixture without retaining its raw console message', () => {
  const page = new EventEmitter();
  const errors = collectCriticalErrors(page);
  page.emit('console', {
    type: () => 'error',
    text: () => 'Export error: Error: Falha visual controlada',
    location: () => ({ url: 'http://localhost/index.html' })
  });
  page.emit('console', {
    type: () => 'error',
    text: () => 'Export error: Error: falha inesperada com token privado',
    location: () => ({ url: 'http://localhost/index.html' })
  });
  assert.equal(errors.length, 2);
  assert.match(errors[0], /source=console kind=controlled-export-error/);
  assert.match(errors[1], /source=console kind=browser-error/);
  assert.doesNotMatch(JSON.stringify(errors), /Falha visual controlada|token privado/);
});

test('attempts every fixture restoration even when the first fails', async () => {
  const calls = [];
  await assert.rejects(restoreFixtureActions([
    async () => { calls.push('meal'); throw new Error('secret fixture payload'); },
    async () => { calls.push('pantry'); },
    async () => { calls.push('language'); throw new Error('private language payload'); }
  ]), /authenticated-fixture-restore-failed:1,3/);
  assert.deepEqual(calls, ['meal', 'pantry', 'language']);
});

test('bootstrap DOM diagnostic exposes only fixed boolean and ready-state fields', async () => {
  const diagnostic = await readSafeBootstrapState({
    evaluate: async () => ({
      loadingPresent: true,
      loadingHidden: false,
      hideRequested: false,
      hideTimerPending: true,
      removeTimerPending: false,
      appMainPresent: true,
      readyState: 'private-uid token=secret'
    })
  });
  assert.equal(diagnostic, 'bootstrap-dom loading=true hidden=false hide-requested=false hide-timer=true remove-timer=false app-main=true document=unknown');
  assert.doesNotMatch(diagnostic, /private-uid|token|secret/);
  assert.equal(await readSafeBootstrapState({ evaluate: async () => { throw new Error('private token'); } }), 'bootstrap-dom unavailable');
});
