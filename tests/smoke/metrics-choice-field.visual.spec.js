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

test.describe('authenticated Metrics ChoiceField visual contract', () => {
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

  async function openNutritionProfile(page, labels = { metrics: /M.tricas/i, goals: 'Metas' }) {
    await clickByTutorialKeyOrText(page, 'tab-metricas', labels.metrics);
    await page.getByRole('button', { name: labels.goals, exact: true }).click();
    await expect(page.locator('[data-tutorial="nutrition-profile"]')).toBeVisible();
  }

  test('uses the approved described sheets in light and dark modes', async ({ page }) => {
    test.setTimeout(90000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');

    for (const theme of ['light', 'dark']) {
      await setTheme(page, theme);
      await openNutritionProfile(page);

      const profile = page.locator('[data-tutorial="nutrition-profile"]');
      const activityTrigger = page.locator('#metrics-activity-trigger');
      const goalTrigger = page.locator('#metrics-goal-trigger');
      await expect(profile.locator('select:visible')).toHaveCount(0);
      await expect(profile.locator('[data-choice-field-mode="sheet"]')).toHaveCount(2);
      await expect(activityTrigger).toBeVisible();
      await expect(goalTrigger).toBeVisible();

      await activityTrigger.click();
      const sheet = page.locator('[data-choice-field-sheet="true"]');
      await expect(sheet).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Atividade física', exact: true })).toBeVisible();
      await expect(sheet.locator('[role="option"]')).toHaveCount(5);
      await expect(sheet.locator('[data-choice-field-option-description="true"]')).toHaveCount(5);

      const styles = await page.evaluate(() => {
        const triggerStyle = getComputedStyle(document.querySelector('#metrics-activity-trigger'));
        const sheetStyle = getComputedStyle(document.querySelector('[data-choice-field-sheet="true"]'));
        return {
          triggerBackground: triggerStyle.backgroundColor,
          triggerRadius: triggerStyle.borderRadius,
          sheetBackground: sheetStyle.backgroundColor,
          sheetRadius: sheetStyle.borderTopLeftRadius,
          sheetBackdrop: sheetStyle.backdropFilter || sheetStyle.webkitBackdropFilter,
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      expect(styles.triggerRadius).toBe('14px');
      expect(styles.sheetRadius).toBe('22px');
      expect(styles.sheetBackdrop).not.toBe('none');
      expect(styles.sheetBackground).not.toBe('rgba(0, 0, 0, 0)');
      expect(styles.scrollWidth).toBe(styles.viewportWidth);
      expect(styles.triggerBackground).toBe(theme === 'light' ? 'rgb(247, 246, 242)' : 'rgb(38, 38, 36)');
      await expect(activityTrigger.locator('[data-choice-field-chevron] path')).toHaveAttribute('stroke-width', '1.35');

      const selectedActivity = sheet.locator('[role="option"][aria-selected="true"]').first();
      await expect(selectedActivity).toBeVisible();
      const selectedActivityLabel = await selectedActivity.locator('[data-choice-field-option-label]').innerText();
      await expect(selectedActivity.locator('[data-choice-field-selection] path')).toHaveAttribute('stroke-width', '1.45');
      await selectedActivity.click();
      await expect(sheet).toHaveCount(0);
      await expect(activityTrigger).toContainText(selectedActivityLabel);

      await goalTrigger.click();
      await expect(sheet).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Objetivo', exact: true })).toBeVisible();
      await expect(sheet.locator('[role="option"]')).toHaveCount(3);
      await expect(sheet.locator('[data-choice-field-option-description="true"]')).toHaveCount(3);
      const selectedGoal = sheet.locator('[role="option"][aria-selected="true"]').first();
      await expect(selectedGoal).toBeVisible();
      const selectedGoalLabel = await selectedGoal.locator('[data-choice-field-option-label]').innerText();
      await selectedGoal.click();
      await expect(sheet).toHaveCount(0);
      await expect(goalTrigger).toContainText(selectedGoalLabel);
    }

    await expectNoCriticalErrors(errors);
  });

  test('takes Metrics labels and option copy from PT, EN, and ES app language', async ({ page }) => {
    test.setTimeout(90000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    const languages = [
      { code: 'pt', metrics: /M.tricas/i, goals: 'Metas', field: 'Objetivo', option: 'Manutenção' },
      { code: 'en', metrics: /Metrics/i, goals: 'Goals', field: 'Goal', option: 'Maintenance' },
      { code: 'es', metrics: /M.tricas/i, goals: 'Metas', field: 'Objetivo', option: 'Mantenimiento' },
    ];

    for (const language of languages) {
      await setAppLanguage(page, language.code);
      await openNutritionProfile(page, language);
      const goalTrigger = page.locator('#metrics-goal-trigger');
      await expect(goalTrigger).toBeVisible();
      await goalTrigger.click();
      await expect(page.getByRole('heading', { name: language.field, exact: true })).toBeVisible();
      await expect(page.getByRole('option').filter({ hasText: language.option }).first()).toBeVisible();
      await page.locator('[data-choice-field-close]').click();
    }

    await expectNoCriticalErrors(errors);
  });
});
