const { test, expect } = require('./app-check-fixture');
const { expectNoCriticalErrors, openApp } = require('./test-helpers');

async function startLoggedOut(page, theme) {
  await page.addInitScript(nextTheme => {
    localStorage.removeItem('fb_token');
    localStorage.removeItem('fb_refresh');
    localStorage.removeItem('fb_uid');
    localStorage.removeItem('fb_email');
    localStorage.setItem('appLang', 'pt');
    localStorage.setItem('appThemeDefaultDarkV1', '1');
    localStorage.setItem('appDarkMode', String(nextTheme === 'dark'));
  }, theme);
  return openApp(page);
}

async function installRequiredProfileFixture(page) {
  await page.evaluate(() => {
    window.__profileChoiceVisual = { language: 'pt' };
    window.fbSignIn = async email => localStorage.setItem('fb_email', email);
    window.fbCheckEmailVerified = async () => true;
    window.storage.get = async key => (
      Object.prototype.hasOwnProperty.call(window.__profileChoiceVisual, key)
        ? { value: window.__profileChoiceVisual[key] }
        : null
    );
    window.storage.set = async (key, value) => {
      window.__profileChoiceVisual[key] = value;
      return true;
    };
    window.storage.getMany = async keys => Object.fromEntries(keys.map(key => [
      key,
      Object.prototype.hasOwnProperty.call(window.__profileChoiceVisual, key)
        ? { value: window.__profileChoiceVisual[key] }
        : null
    ]));
    window.storage.readDailyStateCompatible = async () => ({ log: {}, waterIntake: [], supplementLog: [] });
    window.storage.migrateDailyEntries = async () => ({ migrated: false });
    window.storage.subscribeMany = () => () => {};
  });
}

for (const theme of ['light', 'dark']) {
  test(`registration gender expands inline and closes immediately in ${theme} mode`, async ({ page }) => {
    const errors = await startLoggedOut(page, theme);
    await page.getByRole('button', { name: /Criar conta|Create account/i }).first().click();

    const field = page.locator('[data-choice-field][data-choice-field-mode="inline"]').filter({
      has: page.locator('#registration-gender-trigger')
    });
    const trigger = page.locator('#registration-gender-trigger');
    await expect(field).toBeVisible();
    await expect(page.locator('select:visible')).toHaveCount(0);
    await trigger.click();

    const inlineOptions = field.locator('[data-choice-field-inline-options="true"]');
    await expect(inlineOptions).toBeVisible();
    await expect(page.locator('[data-choice-field-overlay="true"]')).toHaveCount(0);
    const styles = await page.evaluate(() => {
      const triggerNode = document.querySelector('#registration-gender-trigger');
      const inlineNode = document.querySelector('[data-choice-field-inline-options="true"]');
      const triggerStyle = getComputedStyle(triggerNode);
      const inlineStyle = getComputedStyle(inlineNode);
      return {
        triggerBackground: triggerStyle.backgroundColor,
        triggerRadius: triggerStyle.borderRadius,
        inlineBackground: inlineStyle.backgroundColor,
        inlineRadius: inlineStyle.borderRadius,
        inlineBackdrop: inlineStyle.backdropFilter || inlineStyle.webkitBackdropFilter,
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      };
    });

    expect(styles.triggerRadius).toBe('14px');
    expect(styles.inlineRadius).toBe(styles.viewportWidth >= 1024 ? '10px' : '14px');
    expect(styles.inlineBackdrop).not.toBe('none');
    expect(styles.scrollWidth).toBe(styles.viewportWidth);
    expect(styles.triggerBackground).toBe(theme === 'light' ? 'rgb(247, 246, 242)' : 'rgb(38, 38, 36)');
    expect(styles.inlineBackground).not.toBe('rgba(0, 0, 0, 0)');
    await expect(trigger.locator('[data-choice-field-chevron] path')).toHaveAttribute('stroke-width', '1.35');

    await page.getByRole('option', { name: 'Feminino', exact: true }).click();
    await expect(inlineOptions).toHaveCount(0);
    await expect(trigger).toContainText('Feminino');
    await trigger.click();
    await expect(field.locator('[data-choice-field-selection] path')).toHaveAttribute('stroke-width', '1.45');
    await expectNoCriticalErrors(errors);
  });

  test(`required profile combines inline gender with described sheets in ${theme} mode`, async ({ page }) => {
    const errors = await startLoggedOut(page, theme);
    await installRequiredProfileFixture(page);
    await page.locator('input[type="email"]').fill('verified@example.test');
    await page.locator('input[type="password"]').fill('secret123');
    await page.getByRole('button', { name: /Entrar|Sign in/i }).last().click();

    const modal = page.locator('[data-required-profile-modal="true"]');
    await expect(modal).toBeVisible();
    await expect(page.locator('select:visible')).toHaveCount(0);
    await expect(page.locator('[data-choice-field-mode="inline"]')).toHaveCount(1);
    await expect(page.locator('[data-choice-field-mode="sheet"]')).toHaveCount(2);

    await page.locator('#required-profile-gender-trigger').click();
    await expect(page.locator('[data-choice-field-inline-options="true"]')).toBeVisible();
    await page.getByRole('option', { name: 'Feminino', exact: true }).click();
    await expect(page.locator('[data-choice-field-inline-options="true"]')).toHaveCount(0);

    await page.locator('#required-profile-activity-trigger').click();
    const sheet = page.locator('[data-choice-field-sheet="true"]');
    await expect(sheet).toBeVisible();
    await expect(page.getByRole('option').filter({ hasText: /Moderadamente ativo/i })).toBeVisible();
    const styles = await page.evaluate(() => {
      const formStyle = getComputedStyle(document.querySelector('[data-required-profile-form="true"]'));
      const activityTriggerStyle = getComputedStyle(document.querySelector('#required-profile-activity-trigger'));
      const sheetStyle = getComputedStyle(document.querySelector('[data-choice-field-sheet="true"]'));
      return {
        formBackground: formStyle.backgroundColor,
        formColor: formStyle.color,
        formRadius: formStyle.borderRadius,
        activityTriggerRadius: activityTriggerStyle.borderRadius,
        sheetBackground: sheetStyle.backgroundColor,
        sheetColor: sheetStyle.color,
        sheetBackdrop: sheetStyle.backdropFilter || sheetStyle.webkitBackdropFilter,
        viewportWidth: document.documentElement.clientWidth
      };
    });

    expect(styles.formRadius).toBe(styles.viewportWidth >= 1024 ? '16px' : '22px');
    expect(styles.activityTriggerRadius).toBe('14px');
    expect(styles.formBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(styles.sheetBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(styles.sheetBackdrop).not.toBe('none');
    await page.getByRole('option').filter({ hasText: /Moderadamente ativo/i }).click();
    await expect(sheet).toHaveCount(0);
    await expect(page.locator('#required-profile-activity-trigger')).toContainText('Moderadamente ativo');
    await expectNoCriticalErrors(errors);
  });
}
