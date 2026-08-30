const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('./app-check-fixture');
const {
  AUTH_STATE_PATH,
  email,
  password,
  hasCredentials,
  missingCredentialsMessage
} = require('./test-credentials');
const { dismissTutorialIfVisible, interceptOptionalExternalApis, setDateFieldValue } = require('./test-helpers');

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

  const appNavigation = page.locator('button').filter({
    hasText: /Di.rio|Diary|Alimentos|Foods|Semana|Week|M.tricas|Metrics|Métricas/i
  }).first();
  const requiredProfile = page.getByText(
    /Completar perfil nutricional|Complete nutrition profile/i
  );
  await expect.poll(async () => (
    await appNavigation.isVisible() || await requiredProfile.isVisible()
  ), { timeout: 20000 }).toBe(true);

  // The authenticated fixture is disposable and may legitimately have no
  // profile after the C28 one-time Auth cutover. Make setup self-contained
  // instead of depending on data left by an earlier workflow run.
  if (await requiredProfile.isVisible()) {
    await setDateFieldValue(page, '#required-profile-birth-date-trigger', '1990-06-15');
    await page.locator('#required-profile-gender-trigger').click();
    await page.getByRole('option', { name: /Feminino|Female|Femenino/i }).click();
    await page.locator('#required-profile-activity-trigger').click();
    await page.getByRole('option').filter({ hasText: /Moderadamente ativo|Moderately active|Moderadamente activo/i }).click();
    await page.locator('#required-profile-goal-trigger').click();
    await page.getByRole('option').filter({ hasText: /Manutenção do peso|Weight maintenance|Mantenimiento del peso/i }).click();
    await page.getByRole('button', {
      name: /Salvar e continuar|Save and continue|Guardar y continuar/i
    }).click();
  }

  await expect(appNavigation).toBeVisible({ timeout: 20000 });

  await dismissTutorialIfVisible(page);
  // Modular Firebase Auth persists its session in IndexedDB. Preserve that
  // database as part of the reusable authenticated state for Vite runs.
  await page.context().storageState({ path: AUTH_STATE_PATH, indexedDB: true });
});
