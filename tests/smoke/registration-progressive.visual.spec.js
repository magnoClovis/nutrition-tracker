const { test, expect } = require('./app-check-fixture');
const {
  expectNoCriticalErrors,
  fillProgressiveRegistration,
  openApp,
} = require('./test-helpers');

const languages = {
  pt: { tab: /Criar conta/i, step: 'Etapa 7 de 7', review: 'Revise seu perfil' },
  en: { tab: /Create account/i, step: 'Step 7 of 7', review: 'Review your profile' },
  es: { tab: /Crear cuenta/i, step: 'Paso 7 de 7', review: 'Revisa tu perfil' },
};

async function startRegistration(page, language, theme) {
  await page.addInitScript(({ language, theme }) => {
    localStorage.removeItem('fb_token');
    localStorage.removeItem('fb_refresh');
    localStorage.removeItem('fb_uid');
    localStorage.removeItem('fb_email');
    localStorage.setItem('appLang', language);
    localStorage.setItem('appThemeDefaultDarkV1', '1');
    localStorage.setItem('appDarkMode', String(theme === 'dark'));
    localStorage.setItem('appThemePolicyVersion', '2');
    localStorage.setItem('appThemePreference', theme);
  }, { language, theme });
  const errors = await openApp(page);
  await page.getByRole('button', { name: languages[language].tab }).first().click();
  return errors;
}

for (const theme of ['light', 'dark']) {
  for (const language of Object.keys(languages)) {
    test(`registration review is progressive in ${language} ${theme}`, async ({ page }) => {
      const errors = await startRegistration(page, language, theme);
      await fillProgressiveRegistration(page, {
        email: `i2-${language}-${theme}@example.test`,
        name: 'I2 Profile',
      });

      const form = page.locator('form[data-registration-step="6"]');
      await expect(form).toBeVisible();
      await expect(page.locator('[data-registration-progress="true"]')).toContainText(languages[language].step);
      await expect(page.locator('[data-registration-review="true"]')).toContainText(languages[language].review);
      await expect(page.locator('[data-registration-review="true"] > div > div')).toHaveCount(7);
      await expect(form.getByRole('button', { name: languages[language].tab })).toBeVisible();
      await expectNoCriticalErrors(errors);
    });
  }
}

test('registration preserves values when going back and removes motion on request', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await startRegistration(page, 'pt', 'light');
  await fillProgressiveRegistration(page, { name: 'Perfil preservado', stopAt: 2 });
  await page.locator('[data-registration-back="true"]').click();
  await expect(page.locator('form[data-registration-step="1"]')).toBeVisible();
  await page.locator('[data-registration-back="true"]').click();
  await expect(page.locator('input[autocomplete="name"]')).toHaveValue('Perfil preservado');
  await expect(page.locator('.registration-step')).toHaveCSS('animation-name', 'none');
  await expectNoCriticalErrors(errors);
});
