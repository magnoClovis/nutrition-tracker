const { expect } = require('@playwright/test');

function isIgnorableConsoleError(text) {
  return /favicon/i.test(text)
    || /Failed to load resource: the server responded with a status of 404 \(\)/i.test(text);
}

function collectCriticalErrors(page) {
  const errors = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (!isIgnorableConsoleError(text)) errors.push(text);
  });

  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function openApp(page) {
  const errors = collectCriticalErrors(page);
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#root')).toBeVisible();
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 10000 });
  return errors;
}

async function expectNoCriticalErrors(errors) {
  expect(errors, `critical browser errors:\n${errors.join('\n')}`).toEqual([]);
}

async function dismissTutorialIfVisible(page) {
  const closePattern = /Pular|Skip|Saltar|Fechar|Close|Cerrar|Concluir|Finish|Finalizar/i;
  const nextPattern = /Pr[oó]ximo|Next|Siguiente|Ir ao tutorial|Go to tutorial|Ir al tutorial/i;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const closeButton = page.getByRole('button', { name: closePattern }).first();
    if (await closeButton.isVisible({ timeout: 300 }).catch(() => false)) {
      await closeButton.click({ force: true });
      await page.waitForTimeout(150);
      continue;
    }

    const nextButton = page.getByRole('button', { name: nextPattern }).first();
    if (await nextButton.isVisible({ timeout: 300 }).catch(() => false)) {
      await nextButton.click({ force: true });
      await page.waitForTimeout(150);
      continue;
    }

    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(100);
    break;
  }
}

async function clickFirstButtonMatching(page, pattern) {
  const button = page.locator('button').filter({ hasText: pattern }).first();
  await expect(button).toBeVisible();
  await button.click();
}

async function clickByTutorialKeyOrText(page, tutorialKey, fallbackPattern) {
  await dismissTutorialIfVisible(page);
  const tutorialTarget = page.locator(`[data-tutorial="${tutorialKey}"]:visible`).first();

  if (await tutorialTarget.isVisible({ timeout: 1000 }).catch(() => false)) {
    await tutorialTarget.click({ timeout: 5000 });
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
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 10000 });
  await dismissTutorialIfVisible(page);
}

async function interceptOptionalExternalApis(page, { groqDelayMs = 0 } = {}) {
  await page.route('https://api.groq.com/**', async (route) => {
    if (groqDelayMs) await new Promise(resolve => setTimeout(resolve, groqDelayMs));
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
  interceptOptionalExternalApis,
  openApp,
  setAppLanguage
};
