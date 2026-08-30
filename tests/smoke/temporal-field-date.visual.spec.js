const { test, expect } = require('./app-check-fixture');
const { expectNoCriticalErrors, openApp } = require('./test-helpers');

async function startLoggedOut(page, theme, language = 'pt') {
  await page.addInitScript(({ nextTheme, nextLanguage }) => {
    localStorage.removeItem('fb_token');
    localStorage.removeItem('fb_refresh');
    localStorage.removeItem('fb_uid');
    localStorage.removeItem('fb_email');
    localStorage.setItem('appLang', nextLanguage);
    localStorage.setItem('appThemeDefaultDarkV1', '1');
    localStorage.setItem('appDarkMode', String(nextTheme === 'dark'));
  }, { nextTheme: theme, nextLanguage: language });
  return openApp(page);
}

async function installRequiredProfileFixture(page) {
  await page.evaluate(() => {
    window.__dateFieldVisual = { language: 'pt' };
    window.fbSignIn = async email => localStorage.setItem('fb_email', email);
    window.fbCheckEmailVerified = async () => true;
    window.storage.get = async key => Object.prototype.hasOwnProperty.call(window.__dateFieldVisual, key)
      ? { value: window.__dateFieldVisual[key] } : null;
    window.storage.set = async (key, value) => { window.__dateFieldVisual[key] = value; return true; };
    window.storage.getMany = async keys => Object.fromEntries(keys.map(key => [
      key, Object.prototype.hasOwnProperty.call(window.__dateFieldVisual, key)
        ? { value: window.__dateFieldVisual[key] } : null
    ]));
    window.storage.readDailyStateCompatible = async () => ({ log: {}, waterIntake: [], supplementLog: [] });
    window.storage.migrateDailyEntries = async () => ({ migrated: false });
    window.storage.subscribeMany = () => () => {};
  });
}

for (const theme of ['light', 'dark']) {
  test(`registration date picker and direct year entry match ${theme} theme`, async ({ page }) => {
    const errors = await startLoggedOut(page, theme);
    await page.getByRole('button', { name: /Criar conta|Create account/i }).first().click();
    await expect(page.locator('input[type="date"]')).toHaveCount(0);

    const trigger = page.locator('#registration-birth-date-trigger');
    await trigger.click();
    const sheet = page.locator('[data-temporal-field-kind="date"]');
    await expect(sheet).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Escolher data de nascimento' })).toBeVisible();
    const styles = await page.evaluate(() => {
      const sheetStyle = getComputedStyle(document.querySelector('[data-temporal-field-kind="date"]'));
      const triggerStyle = getComputedStyle(document.querySelector('#registration-birth-date-trigger'));
      const selectedStyle = getComputedStyle(document.querySelector('[data-temporal-field-selected-date="true"]'));
      return {
        sheetBackground: sheetStyle.backgroundColor,
        sheetRadius: sheetStyle.borderTopLeftRadius,
        sheetBackdrop: sheetStyle.backdropFilter || sheetStyle.webkitBackdropFilter,
        triggerBackground: triggerStyle.backgroundColor,
        selectedColor: selectedStyle.color,
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(styles.sheetRadius).toBe('28px');
    expect(styles.sheetBackdrop).not.toBe('none');
    expect(styles.scrollWidth).toBe(styles.viewportWidth);
    expect(styles.triggerBackground).toBe(theme === 'light' ? 'rgb(247, 246, 242)' : 'rgb(38, 38, 36)');
    expect(styles.sheetBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(styles.selectedColor).toBe(theme === 'light' ? 'rgb(39, 80, 10)' : 'rgb(151, 196, 89)');

    await page.getByRole('button', { name: 'Escolher mês e ano' }).click();
    const yearButton = page.locator('[data-temporal-field-year="true"]');
    await yearButton.click();
    await expect(page.locator('[data-numeric-keypad="true"]')).toBeVisible();
    for (const digit of ['1', '9', '9', '2']) await page.getByRole('button', { name: digit, exact: true }).click();
    await page.locator('[data-numeric-keypad-confirm="true"]').click();
    await expect(yearButton).toHaveText('1992');
    await page.getByRole('button', { name: 'Mostrar dias' }).click();
    await page.getByRole('gridcell', { name: /15 de/i }).click();
    await page.locator('[data-temporal-field-confirm="true"]').click();
    await expect(trigger).not.toContainText('--/--/----');
    await expectNoCriticalErrors(errors);
  });

  test(`required profile also uses the shared ${theme} date picker`, async ({ page }) => {
    const errors = await startLoggedOut(page, theme);
    await installRequiredProfileFixture(page);
    await page.locator('input[type="email"]').fill('verified@example.test');
    await page.locator('input[type="password"]').fill('secret123');
    await page.getByRole('button', { name: /Entrar|Sign in/i }).last().click();
    await expect(page.locator('[data-required-profile-modal="true"]')).toBeVisible();
    await expect(page.locator('input[type="date"]')).toHaveCount(0);
    await page.locator('#required-profile-birth-date-trigger').click();
    await expect(page.locator('[data-temporal-field-kind="date"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Escolher data de nascimento' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.locator('[data-temporal-field-kind="date"]')).toHaveCount(0);
    await expectNoCriticalErrors(errors);
  });
}

test('date picker labels follow PT, EN, and ES selected inside the app', async ({ page }) => {
  const cases = [
    ['pt', 'Escolher data de nascimento', 'Escolher mês e ano'],
    ['en', 'Choose date of birth', 'Choose month and year'],
    ['es', 'Elegir fecha de nacimiento', 'Elegir mes y año'],
  ];
  for (const [language, heading, jumpLabel] of cases) {
    const errors = await startLoggedOut(page, 'light', language);
    await page.getByRole('button', { name: /Criar conta|Create account|Crear cuenta/i }).first().click();
    await page.locator('#registration-birth-date-trigger').click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(page.getByRole('button', { name: jumpLabel })).toBeVisible();
    await expectNoCriticalErrors(errors);
    await page.getByRole('button', { name: /Cancelar|Cancel/ }).click();
  }
});
