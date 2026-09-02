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

test.describe('authenticated Metrics NumericField visual contract', () => {
  test.skip(!hasCredentials, missingCredentialsMessage);
  test.use({ storageState: AUTH_STATE_PATH });

  async function setTheme(page, theme) {
    await page.evaluate(nextTheme => {
      localStorage.setItem('appThemeDefaultDarkV1', '1');
      localStorage.setItem('appDarkMode', String(nextTheme === 'dark'));
    }, theme);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
    await dismissTutorialIfVisible(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  }

  async function openTracking(page, metricsLabel = /M.tricas/i) {
    await clickByTutorialKeyOrText(page, 'tab-metricas', metricsLabel);
    const measures = page.locator('[data-tutorial="metrics-measures"]');
    await expect(measures).toBeVisible();
    return measures.locator('..');
  }

  test('uses the approved keypad for frequent body measurements in every viewport and theme', async ({ page }) => {
    test.setTimeout(150000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');

    const cases = [
      [{ width: 1280, height: 850 }, 'light'],
      [{ width: 1280, height: 850 }, 'dark'],
      [{ width: 390, height: 844 }, 'light'],
      [{ width: 390, height: 844 }, 'dark'],
    ];

    for (const [viewport, theme] of cases) {
      await page.setViewportSize(viewport);
      await setTheme(page, theme);
      const measures = await openTracking(page);
      await expect(measures.locator('[data-numeric-field="true"]')).toHaveCount(4);
      await expect(measures.locator('input[type="number"]:visible')).toHaveCount(0);

      for (const id of ['metrics-weight', 'metrics-body-fat', 'metrics-waist', 'metrics-muscle-mass']) {
        await expect(page.locator(`#${id}-trigger`)).toBeVisible();
      }

      const trigger = page.locator('#metrics-weight-trigger');
      await trigger.click();
      await expect(page.getByRole('heading', { name: 'Informar peso', exact: true })).toBeVisible();
      const keypadValue = page.locator('[data-numeric-keypad-value="true"]');
      await expect(keypadValue).toHaveAttribute('data-state', 'neutral');

      const styles = await page.evaluate(() => {
        const triggerNode = document.querySelector('#metrics-weight-trigger');
        const sheetNode = document.querySelector('[data-numeric-field-sheet="true"]');
        const valueNode = document.querySelector('[data-numeric-keypad-value="true"]');
        const sheetStyle = getComputedStyle(sheetNode);
        const valueStyle = getComputedStyle(valueNode);
        return {
          triggerBackground: getComputedStyle(triggerNode).backgroundColor,
          sheetRadius: sheetStyle.borderTopLeftRadius,
          sheetBackdrop: sheetStyle.backdropFilter || sheetStyle.webkitBackdropFilter,
          valueBackground: valueStyle.backgroundColor,
          valueColor: valueStyle.color,
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      expect(styles.sheetRadius).toBe('28px');
      expect(styles.sheetBackdrop).not.toBe('none');
      expect(styles.scrollWidth).toBe(styles.viewportWidth);
      if (theme === 'light') {
        expect(styles.triggerBackground).toBe('rgb(247, 246, 242)');
        expect(styles.valueBackground).toBe('rgb(247, 246, 242)');
        expect(styles.valueColor).toBe('rgb(28, 28, 26)');
      } else {
        expect(styles.triggerBackground).toBe('rgb(38, 38, 36)');
        expect(styles.valueBackground).toBe('rgb(38, 38, 36)');
        expect(styles.valueColor).toBe('rgb(241, 239, 232)');
      }

      for (const digit of ['7', '2']) {
        await page.getByRole('button', { name: digit, exact: true }).click();
      }
      await page.locator('[data-numeric-keypad-decimal="true"]').click();
      await page.getByRole('button', { name: '5', exact: true }).click();
      await expect(keypadValue).toHaveAttribute('data-state', 'valid');
      await page.locator('[data-numeric-keypad-confirm="true"]').click();
      await expect(trigger).toContainText('72,5');
      await expect(trigger).toContainText('kg');
    }

    await expectNoCriticalErrors(errors);
  });

  test('takes measurement keypad copy from PT, EN, and ES app language', async ({ page }) => {
    test.setTimeout(90000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    const languages = [
      { code: 'pt', metrics: /M.tricas/i, title: 'Informar gordura corporal', invalid: 'Informe um valor entre 1 e 70%.' },
      { code: 'en', metrics: /Metrics/i, title: 'Enter body fat', invalid: 'Enter a value between 1 and 70%.' },
      { code: 'es', metrics: /M.tricas/i, title: 'Indicar grasa corporal', invalid: 'Indica un valor entre 1 y 70%.' },
    ];

    for (const language of languages) {
      await setAppLanguage(page, language.code);
      await openTracking(page, language.metrics);
      await page.locator('#metrics-body-fat-trigger').click();
      await expect(page.getByRole('heading', { name: language.title, exact: true })).toBeVisible();
      await page.locator('[data-numeric-keypad-confirm="true"]').click();
      await expect(page.locator('[data-numeric-keypad-error="true"]')).toHaveText(language.invalid);
      await page.getByRole('button', { name: /Cancelar|Cancel/ }).click();
    }

    await expectNoCriticalErrors(errors);
  });
});
