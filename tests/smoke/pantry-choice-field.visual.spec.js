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

test.describe('authenticated Pantry ChoiceField visual contract', () => {
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

  async function openPantry(page, label = /Alimentos/i) {
    await clickByTutorialKeyOrText(page, 'tab-despensa', label);
    await expect(page.locator('[data-screen="despensa"]')).toBeVisible();
  }

  async function openFoodRegistration(page, label = /Novo alimento|New food|Nuevo alimento/i) {
    await page.getByRole('button', { name: label }).click();
    await expect(page.locator('#pantry-food-unit-trigger')).toBeVisible();
  }

  async function openSupplementRegistration(page, title = /Adicionar suplemento|Add supplement|A.adir suplemento/i) {
    await page.locator('[data-tutorial="pantry-supplements"]')
      .getByTitle(title)
      .click();
    await expect(page.locator('#pantry-supplement-unit-trigger')).toBeVisible();
  }

  test('uses inline food units and the supplement sheet in light and dark modes', async ({ page }) => {
    test.setTimeout(120000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');

    for (const theme of ['light', 'dark']) {
      await setTheme(page, theme);
      await openPantry(page);
      await openFoodRegistration(page);

      const foodField = page.locator('[data-choice-field][data-choice-field-mode="inline"]').filter({
        has: page.locator('#pantry-food-unit-trigger'),
      });
      const foodTrigger = page.locator('#pantry-food-unit-trigger');
      await expect(foodField).toBeVisible();
      await expect(page.locator('[data-screen="despensa"] select:visible')).toHaveCount(0);
      await foodTrigger.click();

      const inlineOptions = foodField.locator('[data-choice-field-inline-options="true"]');
      await expect(inlineOptions).toBeVisible();
      await expect(inlineOptions.locator('[role="option"]')).toHaveCount(3);
      await expect(page.locator('[data-choice-field-overlay="true"]')).toHaveCount(0);
      const inlineStyles = await page.evaluate(() => {
        const triggerStyle = getComputedStyle(document.querySelector('#pantry-food-unit-trigger'));
        const inlineStyle = getComputedStyle(document.querySelector('[data-choice-field-inline-options="true"]'));
        return {
          triggerBackground: triggerStyle.backgroundColor,
          triggerRadius: triggerStyle.borderRadius,
          inlineBackground: inlineStyle.backgroundColor,
          inlineRadius: inlineStyle.borderRadius,
          inlineBackdrop: inlineStyle.backdropFilter || inlineStyle.webkitBackdropFilter,
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      expect(inlineStyles.triggerRadius).toBe('14px');
      expect(inlineStyles.inlineRadius).toBe(inlineStyles.viewportWidth >= 1024 ? '10px' : '14px');
      expect(inlineStyles.inlineBackdrop).not.toBe('none');
      expect(inlineStyles.inlineBackground).not.toBe('rgba(0, 0, 0, 0)');
      expect(inlineStyles.scrollWidth).toBe(inlineStyles.viewportWidth);
      expect(inlineStyles.triggerBackground).toBe(
        theme === 'light' ? 'rgb(247, 246, 242)' : 'rgb(38, 38, 36)'
      );
      await expect(foodTrigger.locator('[data-choice-field-chevron] path'))
        .toHaveAttribute('stroke-width', '1.35');
      await page.getByRole('option', { name: 'ml', exact: true }).click();
      await expect(inlineOptions).toHaveCount(0);
      await expect(foodTrigger).toContainText('ml');

      await page.getByRole('button', { name: /Fechar cadastro|Close form|Cerrar registro/i }).click();
      await openSupplementRegistration(page);
      const supplementField = page.locator('[data-choice-field][data-choice-field-mode="sheet"]').filter({
        has: page.locator('#pantry-supplement-unit-trigger'),
      });
      const supplementTrigger = page.locator('#pantry-supplement-unit-trigger');
      await expect(supplementField).toBeVisible();
      await supplementTrigger.click();

      const sheet = page.locator('[data-choice-field-sheet="true"]');
      await expect(sheet).toBeVisible();
      await expect(sheet.locator('[role="option"]')).toHaveCount(6);
      await expect(sheet.locator('[data-choice-field-option-description="true"]')).toHaveCount(0);
      const sheetStyles = await page.evaluate(() => {
        const sheetStyle = getComputedStyle(document.querySelector('[data-choice-field-sheet="true"]'));
        return {
          background: sheetStyle.backgroundColor,
          radius: sheetStyle.borderTopLeftRadius,
          backdrop: sheetStyle.backdropFilter || sheetStyle.webkitBackdropFilter,
          bodyOverflow: getComputedStyle(document.body).overflow,
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      expect(sheetStyles.radius).toBe('22px');
      expect(sheetStyles.backdrop).not.toBe('none');
      expect(sheetStyles.background).not.toBe('rgba(0, 0, 0, 0)');
      expect(sheetStyles.bodyOverflow).toBe('hidden');
      expect(sheetStyles.scrollWidth).toBe(sheetStyles.viewportWidth);
      await expect(supplementTrigger.locator('[data-choice-field-chevron] path'))
        .toHaveAttribute('stroke-width', '1.35');
      await expect(sheet.locator('[aria-selected="true"] [data-choice-field-selection] path'))
        .toHaveAttribute('stroke-width', '1.45');
      await page.getByRole('option', { name: 'mg', exact: true }).click();
      await expect(sheet).toHaveCount(0);
      await expect(supplementTrigger).toContainText('mg');
    }

    await expectNoCriticalErrors(errors);
  });

  test('takes unit labels and controls from the PT, EN, and ES app language', async ({ page }) => {
    test.setTimeout(180000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    const languages = [
      { code: 'pt', pantry: /Alimentos/i, unit: 'Unidade', single: 'un', capsule: 'cáps' },
      { code: 'en', pantry: /Foods|Pantry/i, unit: 'Unit', single: 'unit', capsule: 'caps' },
      { code: 'es', pantry: /Alimentos/i, unit: 'Unidad', single: 'ud', capsule: 'cáps' },
    ];

    for (const language of languages) {
      await setAppLanguage(page, language.code);
      await openPantry(page, language.pantry);
      await openFoodRegistration(page);
      const foodTrigger = page.locator('#pantry-food-unit-trigger');
      await foodTrigger.click();
      await expect(page.getByRole('option', { name: language.single, exact: true })).toBeVisible();
      await page.getByRole('option', { name: language.single, exact: true }).click();
      await expect(foodTrigger).toContainText(language.single);
      await page.getByRole('button', { name: /Fechar cadastro|Close form|Cerrar registro/i }).click();

      await openSupplementRegistration(page);
      await page.locator('#pantry-supplement-unit-trigger').click();
      await expect(page.getByRole('heading', { name: language.unit, exact: true })).toBeVisible();
      await expect(page.getByRole('option', { name: language.capsule, exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-choice-field-sheet="true"]')).toHaveCount(0);
    }

    await expectNoCriticalErrors(errors);
  });
});
