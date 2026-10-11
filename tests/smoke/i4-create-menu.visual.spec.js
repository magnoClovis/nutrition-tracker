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

test.describe('I4-A Diary creation menu', () => {
  test.skip(!hasCredentials, missingCredentialsMessage);
  test.use({ storageState: AUTH_STATE_PATH });

  async function openCreateMenu(page) {
    await dismissTutorialIfVisible(page);
    const addButton = page.locator(
      '[data-tutorial="open-log-sheet"]:visible'
    ).first();
    await expect(addButton).toBeVisible();
    await addButton.evaluate(button => button.click());
    const menu = page.locator('[data-diary-create-menu]:visible');
    await expect(menu).toBeVisible();
    await menu.evaluate(async node => {
      await Promise.all(node.getAnimations().map(animation => animation.finished));
    });
    return menu;
  }

  test('uses the approved responsive menu in light and dark modes', async ({ page }) => {
    test.setTimeout(60000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');

    for (const theme of ['light', 'dark']) {
      await page.evaluate(nextTheme => {
        localStorage.setItem('appThemePolicyVersion', '2');
        localStorage.setItem('appThemePreference', nextTheme);
      }, theme);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });

      const menu = await openCreateMenu(page);
      await expect(menu.locator('[data-create-menu-option]')).toHaveCount(4);
      await expect(menu.getByText('Tirar uma foto', { exact: true })).toBeVisible();
      await expect(menu.getByText('Descrever a refeição', { exact: true })).toBeVisible();
      await expect(menu.getByText('Montar manualmente', { exact: true })).toBeVisible();
      await expect(menu.getByText('Usar refeição salva', { exact: true })).toBeVisible();

      const layout = await menu.evaluate(node => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return {
          bottom: Math.round(rect.bottom),
          position: style.position,
          radius: style.borderTopLeftRadius,
          scrollWidth: document.documentElement.scrollWidth,
          viewportHeight: window.innerHeight,
          viewportWidth: document.documentElement.clientWidth,
          variant: node.getAttribute('data-diary-create-menu'),
        };
      });
      expect(layout.position).toBe('fixed');
      expect(layout.scrollWidth).toBe(layout.viewportWidth);
      if (layout.variant === 'sheet') {
        expect(layout.variant).toBe('sheet');
        expect(layout.radius).toBe('28px');
        expect(Math.abs(layout.viewportHeight - layout.bottom)).toBeLessThanOrEqual(1);
      } else {
        expect(layout.variant).toBe('popover');
        expect(layout.radius).toBe('25px');
      }

      await menu.locator('[data-create-menu-close]').click();
      await expect(menu).toHaveCount(0);
    }

    await expectNoCriticalErrors(errors);
  });

  test('takes all visible copy from PT, EN, and ES and routes manual creation', async ({ page }) => {
    test.setTimeout(60000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    const languages = [
      ['pt', 'O que você quer criar?', 'Montar manualmente'],
      ['en', 'What do you want to create?', 'Build manually'],
      ['es', '¿Qué quieres crear?', 'Montar manualmente'],
    ];

    for (const [language, title, manualLabel] of languages) {
      await setAppLanguage(page, language);
      const menu = await openCreateMenu(page);
      await expect(menu.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expect(menu.getByText(manualLabel, { exact: true })).toBeVisible();
      await menu.locator('[data-create-menu-option="manual"]').click();
      await expect(page.locator('[data-app-main="adicionar"]:visible')).toBeVisible();
      await page.locator('[data-add-close]').click();
    }

    await expectNoCriticalErrors(errors);
  });
});
