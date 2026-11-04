const { test, expect } = require('./app-check-fixture');
const {
  AUTH_STATE_PATH,
  hasCredentials,
  missingCredentialsMessage,
} = require('./test-credentials');
const {
  clickByTutorialKeyOrText,
  dismissTutorialIfVisible,
  expectNoCriticalErrors,
  interceptOptionalExternalApis,
  openApp,
  setAppLanguage,
} = require('./test-helpers');

test.describe('I10-A Metrics journey visual contract', () => {
  test.skip(!hasCredentials, missingCredentialsMessage);
  test.use({ storageState: AUTH_STATE_PATH });

  async function setTheme(page, theme) {
    await page.evaluate(nextTheme => {
      localStorage.setItem('appThemePolicyVersion', '2');
      localStorage.setItem('appThemePreference', nextTheme);
    }, theme);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
    await dismissTutorialIfVisible(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  }

  test('matches the approved journey shell in light and dark themes', async ({ page }) => {
    test.setTimeout(120000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'en');

    const cases = [
      [{ width: 390, height: 844 }, 'light'],
      [{ width: 390, height: 844 }, 'dark'],
      [{ width: 1280, height: 850 }, 'light'],
      [{ width: 1280, height: 850 }, 'dark'],
    ];

    for (const [viewport, theme] of cases) {
      await page.setViewportSize(viewport);
      await setTheme(page, theme);
      await clickByTutorialKeyOrText(page, 'tab-metricas', /Metrics/i);

      const screen = page.locator('[data-screen="metricas"]');
      await expect(screen.getByRole('heading', { name: 'Metrics', exact: true })).toBeVisible();
      await expect(screen.getByRole('tab')).toHaveCount(2);
      await expect(screen.getByRole('tab', { name: 'Progress', exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect(screen.locator('[data-i10-journey]')).toBeVisible();
      await expect(screen.locator('[data-tutorial="metrics-current"]')).toBeVisible();
      await expect(screen.locator('[data-tutorial="metrics-measures"]')).toBeVisible();

      const geometry = await screen.evaluate(node => {
        const tabs = node.querySelector('.metrics-journey-tabs');
        const card = node.querySelector('[data-i10-journey]');
        const tiles = node.querySelector('.metrics-current-tiles');
        return {
          tabsHeight: tabs?.getBoundingClientRect().height || 0,
          cardRadius: card ? getComputedStyle(card).borderRadius : '',
          tileColumns: tiles ? getComputedStyle(tiles).gridTemplateColumns.split(' ').length : 0,
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      // Chromium can expose a 44px computed height as 43.999969px after
      // device-scale rounding. Assert the rendered CSS pixel contract.
      expect(Math.round(geometry.tabsHeight)).toBeGreaterThanOrEqual(44);
      expect(geometry.cardRadius).toBe('24px');
      expect(geometry.tileColumns).toBe(3);
      expect(geometry.scrollWidth).toBe(geometry.viewportWidth);

      await screen.getByRole('tab', { name: 'Goals', exact: true }).click();
      await expect(screen.getByRole('tab', { name: 'Goals', exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect(screen.locator('[data-tutorial="nutrition-profile"]')).toBeVisible();
      await screen.getByRole('tab', { name: 'Progress', exact: true }).click();
    }

    await expectNoCriticalErrors(errors);
  });

  test('takes the journey navigation and weigh-in action from PT, EN and ES', async ({ page }) => {
    test.setTimeout(90000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    const languages = [
      { code: 'pt', nav: /M.tricas/i, title: 'Métricas', progress: 'Progresso', goals: 'Metas', log: 'Registrar pesagem' },
      { code: 'en', nav: /Metrics/i, title: 'Metrics', progress: 'Progress', goals: 'Goals', log: 'Log weigh-in' },
      { code: 'es', nav: /M.tricas/i, title: 'Métricas', progress: 'Progreso', goals: 'Metas', log: 'Registrar pesaje' },
    ];

    for (const language of languages) {
      await setAppLanguage(page, language.code);
      await clickByTutorialKeyOrText(page, 'tab-metricas', language.nav);
      const screen = page.locator('[data-screen="metricas"]');
      await expect(screen.getByRole('heading', { name: language.title, exact: true })).toBeVisible();
      await expect(screen.getByRole('tab', { name: language.progress, exact: true })).toBeVisible();
      await expect(screen.getByRole('tab', { name: language.goals, exact: true })).toBeVisible();
      await expect(screen.getByRole('button', { name: language.log, exact: true })).toBeVisible();
    }

    await expectNoCriticalErrors(errors);
  });
});
