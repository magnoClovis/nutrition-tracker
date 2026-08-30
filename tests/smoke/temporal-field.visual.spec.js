const { test, expect } = require('./app-check-fixture');
const {
  AUTH_STATE_PATH,
  hasCredentials,
  missingCredentialsMessage,
} = require('./test-credentials');
const {
  dismissTutorialIfVisible,
  expectNoCriticalErrors,
  interceptOptionalExternalApis,
  openApp,
  setAppLanguage,
} = require('./test-helpers');

test.describe('authenticated TemporalField visual contract', () => {
  test.skip(!hasCredentials, missingCredentialsMessage);
  test.use({ storageState: AUTH_STATE_PATH });

  async function setTheme(page, theme) {
    await page.evaluate(nextTheme => {
      localStorage.setItem('appDarkMode', String(nextTheme === 'dark'));
    }, theme);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
    await dismissTutorialIfVisible(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  }

  async function openTimeField(page) {
    const addButton = page.locator(
      '[data-diary-global-add]:visible [data-tutorial="open-log-sheet"]'
    ).first();
    await expect(addButton).toBeVisible();
    await addButton.evaluate(button => button.click());
    await expect(page.locator('[data-app-main="adicionar"]:visible')).toBeVisible();
    await page.getByRole('button', { name: /Informar horário|Set meal time|Indicar hora/ }).click();
    const trigger = page.locator('#meal-registration-time-trigger');
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.locator('[data-temporal-field-sheet="true"]')).toBeVisible();
    return trigger;
  }

  test('renders the approved picker and keypad in light/dark on desktop and mobile', async ({ page }) => {
    test.setTimeout(90000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');

    const cases = [
      ['desktop-light', { width: 1280, height: 850 }, 'light'],
      ['desktop-dark', { width: 1280, height: 850 }, 'dark'],
      ['mobile-light', { width: 390, height: 844 }, 'light'],
      ['mobile-dark', { width: 390, height: 844 }, 'dark'],
    ];

    for (const [, viewport, theme] of cases) {
      await page.setViewportSize(viewport);
      await setTheme(page, theme);
      const trigger = await openTimeField(page);

      await expect(page.locator('input[type="time"]')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Escolher horário', exact: true })).toBeVisible();
      const sheet = page.locator('[data-temporal-field-sheet="true"]');
      const hourValue = page.locator('[data-temporal-field-value="true"]').first();
      const styles = await page.evaluate(() => {
        const sheetNode = document.querySelector('[data-temporal-field-sheet="true"]');
        const valueNode = document.querySelector('[data-temporal-field-value="true"]');
        const overlayNode = document.querySelector('[data-temporal-field-overlay="true"]');
        const sheetStyle = getComputedStyle(sheetNode);
        const valueStyle = getComputedStyle(valueNode);
        return {
          sheetBackground: sheetStyle.backgroundColor,
          sheetRadius: sheetStyle.borderTopLeftRadius,
          sheetBackdrop: sheetStyle.backdropFilter || sheetStyle.webkitBackdropFilter,
          valueBackground: valueStyle.backgroundColor,
          valueColor: valueStyle.color,
          overlayPosition: getComputedStyle(overlayNode).position,
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      expect(styles.sheetRadius).toBe('28px');
      expect(styles.sheetBackdrop).not.toBe('none');
      expect(styles.overlayPosition).toBe('fixed');
      expect(styles.scrollWidth).toBe(styles.viewportWidth);
      if (theme === 'light') {
        expect(styles.valueBackground).toBe('rgb(234, 243, 222)');
        expect(styles.valueColor).toBe('rgb(39, 80, 10)');
      } else {
        expect(styles.valueBackground).toBe('rgb(23, 52, 4)');
        expect(styles.valueColor).toBe('rgb(151, 196, 89)');
      }

      await expect(page.locator('[data-temporal-field-step] svg').first()).toHaveAttribute('stroke-width', '1.35');
      await hourValue.click();
      await expect(page.locator('[data-numeric-keypad="true"]')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Hora', exact: true })).toBeVisible();
      await page.getByRole('button', { name: '2', exact: true }).click();
      await page.getByRole('button', { name: '0', exact: true }).click();
      await page.locator('[data-numeric-keypad-confirm="true"]').click();
      await expect(hourValue).toHaveText('20');

      const minuteValue = page.locator('[data-temporal-field-value="true"]').nth(1);
      await minuteValue.click();
      await page.getByRole('button', { name: '4', exact: true }).click();
      await page.getByRole('button', { name: '0', exact: true }).click();
      await page.locator('[data-numeric-keypad-confirm="true"]').click();
      await page.locator('[data-temporal-field-confirm="true"]').click();
      await expect(sheet).toHaveCount(0);
      await expect(trigger).toContainText('20:40');

      await page.locator('[data-add-close]').click();
    }

    await expectNoCriticalErrors(errors);
  });

  test('takes every visible label from the selected app language', async ({ page }) => {
    test.setTimeout(60000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    const languages = [
      ['pt', 'Escolher horário', 'Agora'],
      ['en', 'Choose time', 'Now'],
      ['es', 'Elegir hora', 'Ahora'],
    ];

    for (const [language, heading, nowLabel] of languages) {
      await setAppLanguage(page, language);
      await openTimeField(page);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: nowLabel, exact: true })).toBeVisible();
      await page.getByRole('button', { name: /Cancelar|Cancel/ }).click();
      await page.locator('[data-add-close]').click();
    }

    await expectNoCriticalErrors(errors);
  });
});
