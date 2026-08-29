const { test, expect } = require('@playwright/test');
const {
  expectNoCriticalErrors,
  openApp
} = require('./test-helpers');

test('preserves the login, verification, required-profile, and authenticated-app flow', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('fb_token');
    localStorage.removeItem('fb_refresh');
    localStorage.removeItem('fb_uid');
    localStorage.removeItem('fb_email');
  });
  const errors = await openApp(page);

  const expectedGlobals = [
    'fbSignIn',
    'fbGet',
    'fbSet',
    'fbDel',
    'fbList',
    'storage'
  ];
  await expect.poll(() => page.evaluate(names => (
    names.every(name => typeof window[name] === (name === 'storage' ? 'object' : 'function'))
  ), expectedGlobals)).toBe(true);

  await page.evaluate(() => {
    window.__smokeProfile = {
      'seenVisualUpdateNotice_0.8.1': 'true',
      tutorial_most_recent_version_seen: '0.8.0-beta',
      tutorialSeen_main: 'true'
    };
    window.fbSignIn = async (email) => localStorage.setItem('fb_email', email);
    window.fbCheckEmailVerified = async () => true;
    window.storage.get = async key => (
      Object.prototype.hasOwnProperty.call(window.__smokeProfile, key)
        ? { value: window.__smokeProfile[key] }
        : null
    );
    window.storage.set = async (key, value) => {
      window.__smokeProfile[key] = value;
      return true;
    };
    window.storage.delete = async key => {
      delete window.__smokeProfile[key];
      return true;
    };
    window.storage.getMany = async keys => Object.fromEntries(
      keys.map(key => [key, Object.prototype.hasOwnProperty.call(window.__smokeProfile, key)
        ? { value: window.__smokeProfile[key] }
        : null])
    );
    window.storage.readDailyStateCompatible = async () => ({
      log: {},
      waterIntake: [],
      supplementLog: []
    });
    window.storage.migrateDailyEntries = async () => ({ migrated: false });
    window.storage.subscribeMany = () => () => {};
  });

  await page.locator('input[type="email"]').fill('verified@example.test');
  await page.locator('input[type="password"]').fill('secret123');
  await page.getByRole('button', { name: /Entrar|Sign in/i }).last().click();

  await expect(page.getByText(/Completar perfil nutricional|Complete nutrition profile/i)).toBeVisible();
  await page.locator('input[type="date"]').fill('1990-06-15');
  await page.locator('select').nth(0).selectOption('female');
  await page.locator('select').nth(1).selectOption('moderate');
  await page.locator('select').nth(2).selectOption('maintenance');
  await page.getByRole('button', { name: /Salvar e continuar|Save and continue/i }).click();

  await expect(page.locator('[data-screen="diario"]')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Completar perfil nutricional|Complete nutrition profile/i)).toHaveCount(0);
  const releaseNotice = page.locator('[data-release-notice="true"]:visible');
  await expect(releaseNotice).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__smokeProfile.tutorial_most_recent_version_seen)).toBe('0.8.0-beta');
  await releaseNotice.getByRole('button', { name: /Continuar|Continue/i }).click();
  await expect(releaseNotice).toHaveCount(0);
  await expect(page.locator('[data-tutorial-overlay="true"]:visible')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__smokeProfile.tutorial_most_recent_version_seen)).toBe('0.10.0-beta');
  await expectNoCriticalErrors(errors);
});
