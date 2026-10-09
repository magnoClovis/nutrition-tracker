const { expect } = require('@playwright/test');
const { createHash } = require('node:crypto');
const criticalErrorsByPage = new WeakMap();

const SAFE_PATH_PARTS = new Set([
  'v1', 'v2', 'v3', 'projects', 'apps', 'databases', '(default)',
  'documents', 'accounts:signInWithPassword', 'accounts:lookup',
  'accounts:signUp', 'accounts:sendOobCode', 'index.html',
  'recaptcha', 'enterprise', 'reload', 'anchor', 'api.js',
  'images', 'cleardot.gif'
]);
const SAFE_DOMAINS = new Set([
  'localhost', '127.0.0.1', 'firestore.googleapis.com',
  'identitytoolkit.googleapis.com', 'securetoken.googleapis.com',
  'content-firebaseappcheck.googleapis.com', 'www.google.com',
  'apis.google.com', 'magnoclovis.github.io',
  'trofia-ai-proxy.cmagno-dev.workers.dev'
]);

function safeResourceLocation(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return { domain: 'unknown', path: '/:redacted' };
    const domain = SAFE_DOMAINS.has(url.hostname.toLowerCase())
      ? url.hostname.toLowerCase()
      : 'external-host';
    const path = url.pathname.split('/').map((part, index) => {
      if (index === 0 || part === '') return part;
      return SAFE_PATH_PARTS.has(part) ? part : ':redacted';
    }).join('/');
    return { domain, path: path || '/' };
  } catch {
    return { domain: 'unknown', path: '/:redacted' };
  }
}

function safeFailureKind(text) {
  if (/^Export error:\s*(?:Error:\s*)?Falha visual controlada(?:\b|$)/i.test(text || '')) {
    return { kind: 'controlled-export-error', status: 'none' };
  }
  const httpStatus = /status of (\d{3}) \(\)/i.exec(text || '');
  if (httpStatus) return { kind: 'http-error', status: httpStatus[1] };
  if (/net::ERR_TIMED_OUT/i.test(text || '')) return { kind: 'net::ERR_TIMED_OUT', status: 'none' };
  if (/app-check-initialization-failed/i.test(text || '')) return { kind: 'app-check-initialization-failed', status: 'none' };
  if (/profile-incomplete-existing-account/i.test(text || '')) return { kind: 'profile-incomplete-existing-account', status: 'none' };
  return { kind: 'browser-error', status: 'none' };
}

function safeNetworkFailure(request) {
  const code = /net::(ERR_[A-Z_]+)/.exec(request.failure()?.errorText || '');
  return code ? `net::${code[1]}` : 'network-failure';
}

function requestKey(url) {
  return createHash('sha256').update(url || '').digest('hex');
}

function safeDiagnostic({ phase, source, url, method, status, kind }) {
  const location = safeResourceLocation(url);
  const safePhase = /^[a-z0-9-]{1,40}$/i.test(phase || '') ? phase : 'unknown';
  const safeMethod = /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/.test(method || '') ? method : 'unknown';
  const safeStatus = /^(?:[1-5]\d\d|none)$/.test(String(status)) ? status : 'none';
  const safeKind = /^[a-z0-9_:-]{1,50}$/i.test(kind || '') ? kind : 'browser-error';
  const safeSource = ['console', 'pageerror', 'response', 'requestfailed'].includes(source) ? source : 'unknown';
  return `phase=${safePhase} source=${safeSource} kind=${safeKind} domain=${location.domain} path=${location.path} method=${safeMethod} status=${safeStatus}`;
}

function isIgnorableConsoleError(text, locationUrl = '') {
  return /favicon/i.test(text)
    || /Failed to load resource: the server responded with a status of 404 \(\)/i.test(text)
    || /^Framing 'https:\/\/www\.google\.com\/' violates the following report-only Content Security Policy directive: "frame-ancestors 'self'"\./i.test(text)
    || (
      /^requestStorageAccess: Permission denied\.$/i.test(text)
      && /^https:\/\/www\.google\.com\/recaptcha\/enterprise\/anchor\?/i.test(locationUrl)
    )
    || (
      /Failed to load resource: the server responded with a status of 403 \(\)/i.test(text)
      && /^https:\/\/content-firebaseappcheck\.googleapis\.com\/v1\/projects\/[^/]+\/apps\/[^/]+:exchangeRecaptchaEnterpriseToken\?/i.test(locationUrl)
    )
    || (
      /Failed to load resource: the server responded with a status of 403 \(\)/i.test(text)
      && /firestore\.googleapis\.com\/v1\/projects\/[^/]+\/databases\/\(default\)\/documents\/nutrition\?pageSize=1000$/i.test(locationUrl)
    );
}

function collectCriticalErrors(page) {
  const errors = [];
  const requests = new Map();
  Object.defineProperties(errors, {
    diagnostics: { value: [], writable: true },
    phase: { value: 'bootstrap', writable: true }
  });

  function note(diagnostic) {
    errors.diagnostics.push(diagnostic);
    if (errors.diagnostics.length > 50) errors.diagnostics.shift();
  }

  page.on('response', (response) => {
    const request = response.request();
    requests.set(requestKey(response.url()), { method: request.method(), status: response.status() });
    if (requests.size > 100) requests.delete(requests.keys().next().value);
    if (response.status() >= 400) {
      note(safeDiagnostic({ phase: errors.phase, source: 'response', url: response.url(), method: request.method(), status: response.status(), kind: 'http-error' }));
    }
  });

  page.on('requestfailed', (request) => {
    note(safeDiagnostic({ phase: errors.phase, source: 'requestfailed', url: request.url(), method: request.method(), status: 'none', kind: safeNetworkFailure(request) }));
  });

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    const url = message.location().url;
    if (!isIgnorableConsoleError(text, url)) {
      const failure = safeFailureKind(text);
      const response = requests.get(requestKey(url));
      errors.push(safeDiagnostic({
        phase: errors.phase,
        source: 'console',
        url,
        method: response?.method,
        status: response?.status || failure.status,
        kind: failure.kind
      }));
    }
  });

  page.on('pageerror', (error) => {
    const failure = safeFailureKind(error.message);
    errors.push(safeDiagnostic({
      phase: errors.phase,
      source: 'pageerror',
      url: '',
      method: 'unknown',
      status: failure.status,
      kind: failure.kind === 'browser-error'
        ? (['Error', 'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError'].includes(error.name) ? error.name : 'page-error')
        : failure.kind
    }));
  });
  return errors;
}

function setCriticalErrorPhase(errors, phase) {
  errors.phase = phase;
}

function formatSafeDiagnostics(errors) {
  return [...errors, ...(errors.diagnostics || [])].slice(-50).join('\n') || 'none';
}

async function readSafeBootstrapState(page) {
  try {
    const state = await page.evaluate(() => {
      const loading = document.getElementById('loading');
      return {
        loadingPresent: Boolean(loading),
        loadingHidden: Boolean(loading?.classList.contains('is-hidden')),
        hideRequested: window.initialLoadingHideRequested === true,
        hideTimerPending: window.initialLoadingHideTimer != null,
        removeTimerPending: window.initialLoadingRemoveTimer != null,
        appMainPresent: document.querySelector('[data-app-main]') != null,
        rootContentPresent: Boolean(document.getElementById('root')?.firstElementChild),
        readyState: document.readyState,
        bootstrapPhase: document.documentElement.dataset.bootstrapPhase
      };
    });
    const readyState = ['loading', 'interactive', 'complete'].includes(state?.readyState)
      ? state.readyState : 'unknown';
    const bootstrapPhase = [
      'app-check', 'app-check-error', 'auth-restore', 'auth-refresh', 'auth-refresh-timeout', 'auth-ready',
      'email-verification', 'preferences', 'profile-gate',
      'profile-completion', 'profile-incomplete', 'profile-ready',
      'profile-error', 'daily-hydration', 'daily-ready', 'daily-ready-timeout', 'splash-hide', 'bootstrap-error'
    ].includes(state?.bootstrapPhase) ? state.bootstrapPhase : 'not-reported';
    return `bootstrap-dom loading=${Boolean(state?.loadingPresent)} hidden=${Boolean(state?.loadingHidden)} hide-requested=${Boolean(state?.hideRequested)} hide-timer=${Boolean(state?.hideTimerPending)} remove-timer=${Boolean(state?.removeTimerPending)} app-main=${Boolean(state?.appMainPresent)} root-content=${Boolean(state?.rootContentPresent)} document=${readyState} phase=${bootstrapPhase}`;
  } catch {
    return 'bootstrap-dom unavailable';
  }
}

async function formatLanguageReloadFailure(page, errors, criticalStart = 0, diagnosticStart = 0) {
  const state = await readSafeBootstrapState(page);
  const recent = errors
    ? [...errors.slice(criticalStart), ...errors.diagnostics.slice(diagnosticStart)].slice(-50)
    : [];
  return `language-reload-failed; sanitized diagnostics:\n${state}\n${recent.join('\n') || 'none'}`;
}

async function restoreFixtureActions(actions) {
  const failed = [];
  for (const [index, action] of actions.entries()) {
    try {
      await action();
    } catch {
      failed.push(index + 1);
    }
  }
  if (failed.length) throw new Error(`authenticated-fixture-restore-failed:${failed.join(',')}`);
}

async function openApp(page) {
  const errors = collectCriticalErrors(page);
  criticalErrorsByPage.set(page, errors);
  try {
    await page.goto('index.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
  } catch {
    const state = await readSafeBootstrapState(page);
    throw new Error(`app-bootstrap-failed; sanitized diagnostics:\n${state}\n${formatSafeDiagnostics(errors)}`);
  }
  setCriticalErrorPhase(errors, 'scenario');
  return errors;
}

async function expectNoCriticalErrors(errors) {
  expect(errors, `critical browser errors; sanitized diagnostics:\n${formatSafeDiagnostics(errors)}`).toEqual([]);
}

async function dismissTutorialIfVisible(page) {
  const closePattern = /Pular|Skip|Saltar|Fechar|Close|Cerrar|Concluir|Finish|Finalizar/i;
  const nextPattern = /Pr[oó]ximo|Next|Siguiente|Ir ao tutorial|Go to tutorial|Ir al tutorial/i;
  const releaseNotice = page.locator('[data-release-notice="true"]:visible').first();
  if (await releaseNotice.isVisible({ timeout: 300 }).catch(() => false)) {
    const continueButton = releaseNotice.getByRole('button').first();
    await expect(continueButton).toBeVisible();
    await continueButton.click({ force: true });
    await expect(releaseNotice).toBeHidden({ timeout: 3000 });
  }
  const overlay = page.locator('[data-tutorial-overlay="true"]:visible').first();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (!await overlay.isVisible({ timeout: 300 }).catch(() => false)) break;

    const closeButton = overlay.getByRole('button', { name: closePattern }).first();
    if (await closeButton.isVisible({ timeout: 300 }).catch(() => false)) {
      await closeButton.click({ force: true });
      await overlay.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
      continue;
    }

    const nextButton = overlay.getByRole('button', { name: nextPattern }).first();
    if (await nextButton.isVisible({ timeout: 300 }).catch(() => false)) {
      await nextButton.click({ force: true });
      await page.waitForTimeout(150);
      continue;
    }

    break;
  }

  await expect(page.locator('[data-tutorial-overlay="true"]:visible')).toHaveCount(0, { timeout: 3000 });
}

async function clickFirstButtonMatching(page, pattern) {
  const button = page.locator('button').filter({ hasText: pattern }).first();
  await expect(button).toBeVisible();
  await button.click();
}

async function clickByTutorialKeyOrText(page, tutorialKey, fallbackPattern) {
  await dismissTutorialIfVisible(page);
  const tutorialTarget = page.locator(`[data-tutorial="${tutorialKey}"]:visible`).first();

  if (await tutorialTarget.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
    await tutorialTarget.click({ force: true });
    await dismissTutorialIfVisible(page);
    return;
  }

  if (tutorialKey === 'menu-settings') {
    const settingsButton = page.getByRole('button', { name: '⚙', exact: true }).first();
    if (await settingsButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await settingsButton.click();
      await dismissTutorialIfVisible(page);
      return;
    }
  }

  await clickFirstButtonMatching(page, fallbackPattern);
}

async function setAppLanguage(page, language) {
  const errors = criticalErrorsByPage.get(page);
  const criticalStart = errors?.length || 0;
  const diagnosticStart = errors?.diagnostics.length || 0;
  if (errors) setCriticalErrorPhase(errors, 'language-reload');
  try {
    await page.evaluate(async (nextLanguage) => {
      localStorage.setItem('appLang', nextLanguage);
      await window.storage.set('language', nextLanguage);
    }, language);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
  } catch {
    throw new Error(await formatLanguageReloadFailure(page, errors, criticalStart, diagnosticStart));
  } finally {
    if (errors) setCriticalErrorPhase(errors, 'scenario');
  }
  await dismissTutorialIfVisible(page);
}

async function setDateFieldValue(page, triggerSelector, isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  await page.locator(triggerSelector).click();
  await page.locator('[data-temporal-field-month-year="true"]').click();
  await page.locator('[data-temporal-field-year="true"]').click();
  for (const digit of String(year)) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }
  await page.locator('[data-numeric-keypad-confirm="true"]').click();
  await page.locator('[data-temporal-field-months="true"] button').nth(month - 1).click();
  await page.locator('[data-temporal-field-show-days="true"]').click();
  await page.locator('[data-temporal-field-days="true"] button').filter({ hasText: new RegExp(`^${day}$`) }).click();
  await page.locator('[data-temporal-field-confirm="true"]').click();
}

async function fillProgressiveRegistration(page, {
  email = 'new-profile@example.test',
  password = 'secret123456',
  name = 'New Profile',
  birthDate = '1990-06-15',
  gender = /Feminino|Female|Femenino/i,
  weight = '70',
  height = '170',
  activity = /Moderadamente ativo|Moderately active|Moderadamente activo/i,
  goal = /Manter o peso|Maintain weight|Mantener el peso/i,
  stopAt = 6,
} = {}) {
  const form = page.locator('form[data-registration-step]');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[autocomplete="new-password"]').nth(0).fill(password);
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(password);
  await form.getByRole('button', { name: /Continuar|Continue/i }).click();
  await expect(form).toHaveAttribute('data-registration-step', '0');
  if (stopAt === 0) return;

  await page.locator('input[autocomplete="name"]').fill(name);
  await form.getByRole('button', { name: /Continuar|Continue/i }).click();
  await expect(form).toHaveAttribute('data-registration-step', '1');
  if (stopAt === 1) return;

  await setDateFieldValue(page, '#registration-birth-date-trigger', birthDate);
  await form.getByRole('button', { name: /Continuar|Continue/i }).click();
  await expect(form).toHaveAttribute('data-registration-step', '2');
  if (stopAt === 2) return;

  await page.locator('#registration-gender-trigger').click();
  await page.getByRole('option', { name: gender }).click();
  await form.getByRole('button', { name: /Continuar|Continue/i }).click();
  await expect(form).toHaveAttribute('data-registration-step', '3');
  if (stopAt === 3) return;

  await page.locator('input[type="number"]').nth(0).fill(weight);
  await page.locator('input[type="number"]').nth(1).fill(height);
  await form.getByRole('button', { name: /Continuar|Continue/i }).click();
  await expect(form).toHaveAttribute('data-registration-step', '4');
  if (stopAt === 4) return;

  await page.locator('#registration-activity-trigger').click();
  await page.getByRole('option').filter({ hasText: activity }).click();
  await form.getByRole('button', { name: /Continuar|Continue/i }).click();
  await expect(form).toHaveAttribute('data-registration-step', '5');
  if (stopAt === 5) return;

  await page.locator('#registration-goal-trigger').click();
  await page.getByRole('option').filter({ hasText: goal }).click();
  await form.getByRole('button', { name: /Continuar|Continue/i }).click();
  await expect(form).toHaveAttribute('data-registration-step', '6');
}

async function interceptOptionalExternalApis(page, { aiDelayMs = 0 } = {}) {
  await page.route('https://trofia-ai-proxy.cmagno-dev.workers.dev/**', async (route) => {
    if (aiDelayMs) await new Promise(resolve => setTimeout(resolve, aiDelayMs));
    await route.abort('timedout');
  });
  await page.route('https://world.openfoodfacts.org/**', route => route.fulfill({ status: 503, body: '{}' }));
  await page.route('**/reports/**', route => route.fulfill({ status: 503, body: '{}' }));
}

module.exports = {
  clickByTutorialKeyOrText,
  clickFirstButtonMatching,
  collectCriticalErrors,
  dismissTutorialIfVisible,
  expectNoCriticalErrors,
  isIgnorableConsoleError,
  safeResourceLocation,
  safeDiagnostic,
  setCriticalErrorPhase,
  formatSafeDiagnostics,
  restoreFixtureActions,
  readSafeBootstrapState,
  formatLanguageReloadFailure,
  interceptOptionalExternalApis,
  openApp,
  setAppLanguage,
  setDateFieldValue,
  fillProgressiveRegistration
};
