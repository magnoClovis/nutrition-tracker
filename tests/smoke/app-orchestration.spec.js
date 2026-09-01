const { test, expect } = require('./app-check-fixture');
const {
  expectNoCriticalErrors,
  openApp,
  setDateFieldValue
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
  await setDateFieldValue(page, '#required-profile-birth-date-trigger', '1990-06-15');
  await page.locator('#required-profile-gender-trigger').click();
  await page.getByRole('option', { name: /Feminino|Female/i }).click();
  await page.locator('#required-profile-activity-trigger').click();
  await page.getByRole('option').filter({ hasText: /Moderadamente ativo|Moderately active/i }).click();
  await page.locator('#required-profile-goal-trigger').click();
  await page.getByRole('option').filter({ hasText: /Manutenção do peso|Weight maintenance/i }).click();
  await expect(page.locator('[data-choice-field-options="true"]')).toHaveCount(0);
  await page.getByRole('button', { name: /Salvar e continuar|Save and continue/i }).click();

  await expect(page.locator('[data-screen="diario"]')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Completar perfil nutricional|Complete nutrition profile/i)).toHaveCount(0);
  const releaseNotice = page.locator('[data-release-notice="true"]:visible');
  await expect(releaseNotice).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__smokeProfile.tutorial_most_recent_version_seen)).toBe('0.8.0-beta');
  await releaseNotice.getByRole('button', { name: /Continuar|Continue/i }).click();
  await expect(releaseNotice).toHaveCount(0);
  const releaseTutorial = page.locator('[data-tutorial-overlay="true"]:visible');
  await expect(releaseTutorial).toBeVisible();
  for (let step = 0; step < 3; step += 1) {
    await releaseTutorial.getByRole('button', { name: /Próximo|Next|Siguiente/i }).click();
  }
  await releaseTutorial.getByRole('button', { name: /Concluir|Done|Finalizar/i }).click();
  await expect(releaseTutorial).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__smokeProfile.tutorial_most_recent_version_seen)).toBe('0.11.0-beta');
  await expectNoCriticalErrors(errors);
});

test('shows a retryable read error instead of an incomplete-profile modal', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('fb_token');
    localStorage.removeItem('fb_refresh');
    localStorage.removeItem('fb_uid');
    localStorage.removeItem('fb_email');
  });
  const errors = await openApp(page);

  await page.evaluate(() => {
    window.__smokeFailProfileRead = true;
    window.__smokeProfile = {
      birthDate: '1990-06-15',
      gender: 'female',
      activityLevel: 'moderate',
      goalType: 'maintenance',
      'seenVisualUpdateNotice_0.8.1': 'true',
      tutorial_most_recent_version_seen: '0.11.0-beta',
      tutorialSeen_main: 'true'
    };
    const requiredKeys = new Set([
      'birthDate',
      'gender',
      'activityLevel',
      'goalType',
      'goalKg',
      'goalWeeks',
      'manualCalorieAdjustment'
    ]);
    window.fbSignIn = async email => localStorage.setItem('fb_email', email);
    window.fbCheckEmailVerified = async () => true;
    window.storage.get = async key => {
      if (window.__smokeFailProfileRead && requiredKeys.has(key)) {
        throw Object.assign(new Error('simulated profile read failure'), {code: 'permission-denied'});
      }
      return Object.prototype.hasOwnProperty.call(window.__smokeProfile, key)
        ? {value: window.__smokeProfile[key]}
        : null;
    };
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
        ? {value: window.__smokeProfile[key]}
        : null])
    );
    window.storage.readDailyStateCompatible = async () => ({
      log: {},
      waterIntake: [],
      supplementLog: []
    });
    window.storage.migrateDailyEntries = async () => ({migrated: false});
    window.storage.subscribeMany = () => () => {};
  });

  await page.locator('input[type="email"]').fill('verified@example.test');
  await page.locator('input[type="password"]').fill('secret123');
  await page.getByRole('button', {name: /Entrar|Sign in/i}).last().click();

  const readError = page.locator('[data-required-profile-read-error="true"]');
  await expect(readError).toBeVisible();
  await expect(readError).toContainText('permission-denied');
  await expect(page.getByText(/Completar perfil nutricional|Complete nutrition profile/i)).toHaveCount(0);
  await expect(page.locator('[data-screen="diario"]')).toHaveCount(0);

  await page.evaluate(() => { window.__smokeFailProfileRead = false; });
  await readError.getByRole('button', {name: /Tentar novamente|Try again/i}).click();

  await expect(readError).toHaveCount(0);
  await expect(page.locator('[data-screen="diario"]')).toBeVisible({timeout: 15000});
  await expectNoCriticalErrors(errors);
});
