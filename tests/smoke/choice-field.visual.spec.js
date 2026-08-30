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

test.describe('authenticated ChoiceField visual contract', () => {
  test.skip(!hasCredentials, missingCredentialsMessage);
  test.use({ storageState: AUTH_STATE_PATH });

  async function openAddScreen(page) {
    await dismissTutorialIfVisible(page);
    const addButton = page.locator(
      '[data-diary-global-add]:visible [data-tutorial="open-log-sheet"]'
    ).first();
    await expect(addButton).toBeVisible();
    await addButton.evaluate(button => button.click());
    await expect(page.locator('[data-app-main="adicionar"]:visible')).toBeVisible();
  }

  async function setTheme(page, theme) {
    await page.evaluate(nextTheme => {
      localStorage.setItem('appDarkMode', String(nextTheme === 'dark'));
    }, theme);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
    await dismissTutorialIfVisible(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  }

  test('matches the approved light/dark sheet on desktop and mobile', async ({ page }) => {
    test.setTimeout(60000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');

    for (const theme of ['light', 'dark']) {
      await setTheme(page, theme);
      await openAddScreen(page);

      const trigger = page.locator('#manual-meal-choice-trigger');
      await expect(trigger).toBeVisible();
      await expect(page.locator('[data-app-main="adicionar"] select:visible')).toHaveCount(0);
      await trigger.click();

      const sheet = page.locator('[data-choice-field-sheet="true"]');
      const selected = page.locator('[data-choice-field-option="true"][aria-selected="true"]');
      await expect(sheet).toBeVisible();
      await expect(selected).toBeVisible();
      await expect(page.getByRole('option', { name: 'Almoço' })).toBeVisible();

      const styles = await page.evaluate(() => {
        const triggerNode = document.querySelector('#manual-meal-choice-trigger');
        const sheetNode = document.querySelector('[data-choice-field-sheet="true"]');
        const selectedNode = document.querySelector('[data-choice-field-option="true"][aria-selected="true"]');
        const overlayNode = document.querySelector('[data-choice-field-overlay="true"]');
        const triggerStyle = getComputedStyle(triggerNode);
        const sheetStyle = getComputedStyle(sheetNode);
        const selectedStyle = getComputedStyle(selectedNode);
        const overlayStyle = getComputedStyle(overlayNode);
        const confidenceProbe = document.createElement('div');
        confidenceProbe.style.position = 'fixed';
        confidenceProbe.style.left = '-10000px';
        confidenceProbe.innerHTML = ['high', 'medium', 'low'].map(tone => (
          `<button data-choice-field-option="true" data-choice-field-tone="${tone}">`
            + '<span data-choice-field-indicator="true"></span>'
            + '<span data-choice-field-option-copy="true">'
            + '<span data-choice-field-option-label="true">Level</span>'
            + '<span data-choice-field-option-description="true">Description</span>'
            + '</span></button>'
        )).join('');
        document.body.appendChild(confidenceProbe);
        const indicatorColors = Array.from(
          confidenceProbe.querySelectorAll('[data-choice-field-indicator="true"]'),
          node => getComputedStyle(node).backgroundColor
        );
        const descriptionColor = getComputedStyle(
          confidenceProbe.querySelector('[data-choice-field-option-description="true"]')
        ).color;
        confidenceProbe.remove();
        return {
          triggerBackground: triggerStyle.backgroundColor,
          triggerRadius: triggerStyle.borderRadius,
          sheetBackground: sheetStyle.backgroundColor,
          sheetRadius: sheetStyle.borderTopLeftRadius,
          sheetBackdrop: sheetStyle.backdropFilter || sheetStyle.webkitBackdropFilter,
          selectedBackground: selectedStyle.backgroundColor,
          selectedColor: selectedStyle.color,
          selectedHeight: selectedNode.getBoundingClientRect().height,
          overlayPosition: overlayStyle.position,
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          indicatorColors,
          descriptionColor,
        };
      });

      expect(styles.triggerRadius).toBe('14px');
      expect(styles.sheetRadius).toBe('22px');
      expect(styles.sheetBackdrop).not.toBe('none');
      expect(styles.overlayPosition).toBe('fixed');
      expect(styles.selectedHeight).toBeGreaterThanOrEqual(48);
      expect(styles.scrollWidth).toBe(styles.viewportWidth);
      if (theme === 'light') {
        expect(styles.triggerBackground).toBe('rgb(247, 246, 242)');
        expect(styles.selectedBackground).toBe('rgb(234, 243, 222)');
        expect(styles.selectedColor).toBe('rgb(39, 80, 10)');
        expect(styles.indicatorColors).toEqual(['rgb(99, 153, 34)', 'rgb(177, 135, 62)', 'rgb(167, 95, 114)']);
      } else {
        expect(styles.triggerBackground).toBe('rgb(38, 38, 36)');
        expect(styles.selectedBackground).toBe('rgb(23, 52, 4)');
        expect(styles.selectedColor).toBe('rgb(151, 196, 89)');
        expect(styles.indicatorColors).toEqual(['rgb(120, 171, 60)', 'rgb(208, 170, 98)', 'rgb(207, 130, 150)']);
      }
      expect(styles.descriptionColor).not.toBe(styles.selectedColor);

      const selectionPath = selected.locator('[data-choice-field-selection] path');
      const chevronPath = trigger.locator('[data-choice-field-chevron] path');
      await expect(selectionPath).toHaveAttribute('stroke-width', '1.45');
      await expect(chevronPath).toHaveAttribute('stroke-width', '1.35');
      await page.getByRole('option', { name: 'Almoço' }).click();
      await expect(sheet).toHaveCount(0);

      const usesFrozenLegacyLoader = await page.locator('script[src*="app.js"]').count() > 0;
      if (!usesFrozenLegacyLoader) {
        await page.locator('[data-add-mode="image"]').click();
        const imageTrigger = page.locator('#image-meal-category-trigger');
        await expect(imageTrigger).toBeVisible();
        await imageTrigger.click();
        await expect(page.getByRole('heading', { name: 'Categoria da refeição', exact: true })).toBeVisible();
        await expect(page.getByRole('option', { name: 'Almoço', exact: true })).toBeVisible();
        await page.locator('[data-choice-field-close]').click();
      }

      await page.locator('[data-add-close]').click();
      const suggestionButton = page.locator('[data-tutorial="suggest-meal-button"]:visible');
      await expect(suggestionButton).toBeVisible();
      await suggestionButton.evaluate(button => button.click());
      const gaTrigger = page.locator('#ga-target-meal-choice-trigger');
      await expect(gaTrigger).toBeVisible();
      await expect(page.locator('[data-diary-suggestion-block="true"] select:visible')).toHaveCount(0);
      await gaTrigger.click();
      await expect(page.getByRole('heading', { name: 'Refeição alvo', exact: true })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Almoço', exact: true })).toBeVisible();
      await page.locator('[data-choice-field-close]').click();
    }

    await expectNoCriticalErrors(errors);
  });

  test('takes PT, EN, and ES labels from the app language', async ({ page }) => {
    test.setTimeout(60000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    const languages = [
      ['pt', 'Refeição', 'Almoço'],
      ['en', 'Meal', 'Lunch'],
      ['es', 'Comida', 'Almuerzo'],
    ];

    for (const [language, heading, selectedOption] of languages) {
      await setAppLanguage(page, language);
      await openAddScreen(page);
      await page.locator('#manual-meal-choice-trigger').click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.getByRole('option', { name: selectedOption, exact: true })).toBeVisible();
      await page.locator('[data-choice-field-close]').click();
      await page.locator('[data-add-close]').click();
    }

    await expectNoCriticalErrors(errors);
  });
});
