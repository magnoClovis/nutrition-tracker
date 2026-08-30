const { test, expect } = require('./app-check-fixture');
const {
  clickByTutorialKeyOrText,
  clickFirstButtonMatching,
  dismissTutorialIfVisible,
  expectNoCriticalErrors,
  interceptOptionalExternalApis,
  openApp,
  setAppLanguage
} = require('./test-helpers');
const {
  AUTH_STATE_PATH,
  hasCredentials,
  missingCredentialsMessage
} = require('./test-credentials');

test.afterEach(async ({ request }) => {
  await request.get('/index.html').catch(() => {});
});

test.describe('public boot and login screen', () => {
  test('boots without startup errors and renders login controls', async ({ page }) => {
    const errors = await openApp(page);

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Entrar|Sign in/i }).last()).toBeVisible();

    await expectNoCriticalErrors(errors);
  });

  const loginLanguages = [
    { code: 'PT', button: /🇧🇷\s+PT$/, forgot: /Esqueci minha senha/i },
    { code: 'EN', button: /🇺🇸\s+EN$/, forgot: /Forgot password/i },
    { code: 'ES', button: /🇪🇸\s+ES$/, forgot: /Olvidé mi contraseña/i }
  ];

  for (const language of loginLanguages) {
    test(`language toggle persists ${language.code} login copy after reload`, async ({ page }) => {
      const errors = await openApp(page);
      const languageButton = page.getByRole('button', { name: language.button });

      await expect(languageButton).toBeVisible();
      await languageButton.click();
      await expect(page.getByRole('button', { name: language.forgot })).toBeVisible();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
      await expect(page.getByRole('button', { name: language.forgot })).toBeVisible();
      await expect(page.getByRole('button', { name: language.button })).toBeVisible();

      await expectNoCriticalErrors(errors);
    });
  }

  test('migrates once to dark and then preserves the saved theme after reload', async ({ page }) => {
    const errors = await openApp(page);

    await page.evaluate(() => {
      localStorage.setItem('appDarkMode', 'false');
      localStorage.removeItem('appThemeDefaultDarkV1');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('appThemeDefaultDarkV1'))).toBe('1');

    await page.evaluate(() => localStorage.setItem('appDarkMode', 'false'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.evaluate(() => localStorage.setItem('appDarkMode', 'true'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await expectNoCriticalErrors(errors);
  });

  test('password recovery validates an empty email instead of failing silently', async ({ page }) => {
    const errors = await openApp(page);

    await page.getByRole('button', { name: /Esqueci minha senha|Forgot password/i }).click();

    await expect(page.getByText(/Digite seu e-mail|Enter your email/i)).toBeVisible();

    await expectNoCriticalErrors(errors);
  });

  test('toggles password visibility without changing the entered value', async ({ page }) => {
    const errors = await openApp(page);
    const passwordInput = page.locator('input[autocomplete="current-password"]');
    const visibilityButton = page.getByTestId('password-visibility');

    await passwordInput.fill('Secret123!');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(visibilityButton).toHaveAttribute('aria-label', 'Mostrar senha');

    await visibilityButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(passwordInput).toHaveValue('Secret123!');
    await expect(visibilityButton).toHaveAttribute('aria-label', 'Ocultar senha');

    await visibilityButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveValue('Secret123!');
    await expectNoCriticalErrors(errors);
  });

  test('blocks login while the account email is unverified', async ({ page }) => {
    const errors = await openApp(page);

    await page.evaluate(() => {
      window.fbSignIn = async (email) => localStorage.setItem('fb_email', email);
      window.fbCheckEmailVerified = async () => false;
    });
    await page.locator('input[type="email"]').fill('pending@example.com');
    await page.locator('input[type="password"]').fill('secret123');
    await page.getByRole('button', { name: /Entrar|Sign in/i }).last().click();

    await expect(page.getByText(/Verifique seu email|Verify your email/i).first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    await expectNoCriticalErrors(errors);
  });

  test('does not claim verification email delivery when Firebase rejects it', async ({ page }) => {
    const errors = await openApp(page);

    await page.evaluate(() => {
      window.fbSignUp = async () => {};
      window.fbUpdateProfile = async () => {};
      window.fbSet = async () => {};
      window.fbSendVerificationEmail = async () => { throw new Error('EMAIL_DELIVERY_FAILED'); };
    });
    await page.getByRole('button', { name: /Criar conta|Create account/i }).first().click();
    await page.locator('input[type="email"]').fill('new@example.com');
    await page.locator('input[type="password"]').nth(0).fill('secret123');
    await page.locator('input[type="password"]').nth(1).fill('secret123');
    await page.locator('input[autocomplete="name"]').fill('New User');
    await page.locator('input[type="date"]').fill('1990-01-01');
    await page.locator('select').selectOption('female');
    await page.getByRole('button', { name: /Criar conta|Create account/i }).last().click();

    await expect(page.getByText(/EMAIL_DELIVERY_FAILED/)).toBeVisible();
    await expect(page.getByText(/Enviamos um link|We sent a verification link/i)).toHaveCount(0);
    await expectNoCriticalErrors(errors);
  });
});

test.describe('authenticated app smoke tests', () => {
  test.skip(
    !hasCredentials,
    missingCredentialsMessage
  );
  test.use({ storageState: AUTH_STATE_PATH });
  test.beforeEach(async ({ page }) => interceptOptionalExternalApis(page));

  test('opens the critical tabs in Portuguese, English, and Spanish', async ({ page }) => {
    const errors = await openApp(page);
    const languages = [
      { code: 'pt', diary: /Di.rio/i, pantry: /Alimentos/i, week: /Semana/i, metrics: /M.tricas/i, metricText: /Acompanhamento/ },
      { code: 'en', diary: /Diary/i, pantry: /Foods|Pantry/i, week: /Week/i, metrics: /Metrics/i, metricText: /Tracking/ },
      { code: 'es', diary: /Diario/i, pantry: /Alimentos/i, week: /Semana/i, metrics: /M.tricas/i, metricText: /Seguimiento/ }
    ];

    for (const language of languages) {
      await setAppLanguage(page, language.code);
      for (const tab of [
        ['tab-diario', language.diary, '[data-screen="diario"]'],
        ['tab-despensa', language.pantry, '[data-screen="despensa"]'],
        ['tab-semana', language.week, '[data-screen="semana"]'],
        ['tab-metricas', language.metrics, '[data-screen="metricas"]']
      ]) {
        await clickByTutorialKeyOrText(page, tab[0], tab[1]);
        await dismissTutorialIfVisible(page);
        await expect(page.locator(tab[2])).toBeVisible({ timeout: 10000 });
      }
      await expect(page.locator('[data-screen="metricas"]')).toContainText(language.metricText);
    }

    await expectNoCriticalErrors(errors);
  });

  test('validates each Metrics section independently', async ({ page }) => {
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');
    await clickByTutorialKeyOrText(page, 'tab-metricas', /M.tricas/i);

    await expect(page.getByRole('button', { name: 'Acompanhamento' })).toBeVisible();
    await expect(page.locator('[data-tutorial="metrics-measures"]')).toBeVisible();
    await expect(page.locator('[data-tutorial="metrics-current"]')).toBeVisible();
    await expect(page.locator('[data-tutorial="weight-chart"]')).toBeVisible();
    await expect(page.locator('[data-tutorial="bmr-chart"]')).toBeVisible();
    await expect(page.locator('[data-tutorial="body-composition"]')).toBeVisible();
    await expect(page.locator('[data-tutorial="metrics-progress"]')).toBeVisible();

    await page.getByRole('button', { name: 'Metas', exact: true }).click();
    await expect(page.locator('[data-tutorial="nutrition-profile"]')).toBeVisible();
    await expect(page.locator('[data-tutorial="metrics-target-summary"]')).toBeVisible();
    await expect(page.locator('[data-tutorial="metrics-measures"]')).toBeHidden();

    await expectNoCriticalErrors(errors);
  });

  test('opens settings and backup modal', async ({ page }) => {
    const errors = await openApp(page);

    await clickByTutorialKeyOrText(page, 'menu-settings', /Settings|Configura/i);
    await clickFirstButtonMatching(page, /Backup e restaurar|Backup & restore/i);

    await expect(page.getByText(/Backup|Importar|Exportar|Restore|Import|Export/i).first()).toBeVisible();

    await expectNoCriticalErrors(errors);
  });

  test('signs out and returns to the login screen', async ({ page }) => {
    const errors = await openApp(page);

    await clickByTutorialKeyOrText(page, 'menu-settings', /Settings|Configura/i);
    await clickFirstButtonMatching(page, /Sair|Sign out|Log out|Cerrar sesión/i);

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Entrar|Sign in/i }).last()).toBeVisible();

    await expectNoCriticalErrors(errors);
  });
});
