const { expect } = require('@playwright/test');

function isIgnorableConsoleError(text, locationUrl = '') {
  return /favicon/i.test(text)
    || /Failed to load resource: the server responded with a status of 404 \(\)/i.test(text)
    || /^Framing 'https:\/\/www\.google\.com\/' violates the following report-only Content Security Policy directive: "frame-ancestors 'self'"\./i.test(text)
    || (
      /Failed to load resource: the server responded with a status of 403 \(\)/i.test(text)
      && /firestore\.googleapis\.com\/v1\/projects\/[^/]+\/databases\/\(default\)\/documents\/nutrition\?pageSize=1000$/i.test(locationUrl)
    );
}

function collectCriticalErrors(page) {
  const errors = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (!isIgnorableConsoleError(text, message.location().url)) errors.push(text);
  });

  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function openApp(page) {
  const errors = collectCriticalErrors(page);
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#root')).toBeVisible();
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
  return errors;
}

async function expectNoCriticalErrors(errors) {
  expect(errors, `critical browser errors:\n${errors.join('\n')}`).toEqual([]);
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

  await clickFirstButtonMatching(page, fallbackPattern);
}

async function setAppLanguage(page, language) {
  await page.evaluate(async (nextLanguage) => {
    localStorage.setItem('appLang', nextLanguage);
    await window.storage.set('language', nextLanguage);
  }, language);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
  await dismissTutorialIfVisible(page);
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
  interceptOptionalExternalApis,
  openApp,
  setAppLanguage
};
