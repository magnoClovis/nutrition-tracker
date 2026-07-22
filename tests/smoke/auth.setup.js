const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const {
  AUTH_STATE_PATH,
  email,
  password,
  hasCredentials,
  missingCredentialsMessage
} = require('./test-credentials');
const { dismissTutorialIfVisible, interceptOptionalExternalApis } = require('./test-helpers');

test('authenticate disposable test account', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });

  if (!hasCredentials) {
    fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify({ cookies: [], origins: [] }, null, 2));
    console.log(missingCredentialsMessage);
    test.skip(true, missingCredentialsMessage);
  }

  await interceptOptionalExternalApis(page);
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Entrar|Sign in|Iniciar sesi[oó]n/i }).last().click();

  await expect(
    page.locator('button').filter({
      hasText: /Di.rio|Diary|Alimentos|Foods|Semana|Week|M.tricas|Metrics|Métricas/i
    }).first()
  ).toBeVisible({ timeout: 20000 });

  await dismissTutorialIfVisible(page);
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
