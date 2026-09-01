const { test, expect } = require('./app-check-fixture');
const {
  AUTH_STATE_PATH,
  hasCredentials,
  missingCredentialsMessage,
} = require('./test-credentials');
const {
  clickByTutorialKeyOrText,
  clickFirstButtonMatching,
  dismissTutorialIfVisible,
  expectNoCriticalErrors,
  interceptOptionalExternalApis,
  openApp,
  setAppLanguage,
} = require('./test-helpers');

test.describe('authenticated GenericDialog visual and accessibility contract', () => {
  test.skip(!hasCredentials, missingCredentialsMessage);
  test.use({ storageState: AUTH_STATE_PATH });

  const template = JSON.stringify([{
    id: 's9-template',
    name: 'Refeição visual S9',
    meal: 'Almoço',
    items: [{
      foodId: 's9-food', name: 'Alimento visual', qty: 100, unit: 'g',
      protein: 4, kcal: 120, carbs: 20, fat: 2,
    }],
  }]);

  async function installDialogFixture(page) {
    await page.addInitScript(initialTemplates => {
      let installedStorage;
      const fixtureState = {
        mealTemplates: initialTemplates,
        waterCustomPreset: null,
      };

      function decorateStorage(storage) {
        if (!storage || storage.__genericDialogFixture) return storage;
        const originalGet = storage.get.bind(storage);
        const originalSet = storage.set.bind(storage);
        storage.get = async key => Object.prototype.hasOwnProperty.call(fixtureState, key)
          ? (fixtureState[key] == null ? null : { value: fixtureState[key] })
          : originalGet(key);
        storage.set = async (key, value) => {
          if (Object.prototype.hasOwnProperty.call(fixtureState, key)) {
            fixtureState[key] = value;
            return true;
          }
          return originalSet(key, value);
        };
        Object.defineProperty(storage, '__genericDialogFixture', { value: true });
        return storage;
      }

      Object.defineProperty(window, 'storage', {
        configurable: true,
        get: () => installedStorage,
        set: value => { installedStorage = decorateStorage(value); },
      });

      URL.createObjectURL = () => { throw new Error('Falha visual controlada'); };
    }, template);
  }

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

  async function expectOpenDialog(page, { kind, title, tone = 'action' }) {
    const dialog = page.locator('[data-generic-dialog="true"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('data-generic-dialog-kind', kind);
    await expect(dialog).toHaveAttribute('data-generic-dialog-tone', tone);
    await expect(dialog.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.locator('#root')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#root')).toHaveAttribute('inert', '');
    return dialog;
  }

  async function openFeedbackConfirm(page) {
    await clickByTutorialKeyOrText(page, 'menu-settings', /Configura|Settings/i);
    await clickFirstButtonMatching(page, /Enviar feedback|Send feedback|Enviar comentarios/i);
    return expectOpenDialog(page, {
      kind: 'confirm',
      title: /Abrir formulário de feedback/i,
    });
  }

  async function openWaterPrompt(page) {
    await clickByTutorialKeyOrText(page, 'tab-diario', /Di.rio|Diary/i);
    await page.locator('[data-water-configure="true"]').click();
    return expectOpenDialog(page, {
      kind: 'prompt',
      title: /Tamanho da garrafa/i,
    });
  }

  async function openDeleteConfirm(page) {
    await clickByTutorialKeyOrText(page, 'tab-despensa', /Alimentos|Foods/i);
    const section = page.locator('[data-tutorial="pantry-meal-templates"]');
    await expect(section).toBeVisible();
    await section.getByRole('button').first().click();
    await section.getByRole('button', { name: /Apagar|Delete|Eliminar/i }).click();
    return expectOpenDialog(page, {
      kind: 'confirm',
      tone: 'danger',
      title: /Excluir refeição salva/i,
    });
  }

  async function openExportAlert(page) {
    await clickByTutorialKeyOrText(page, 'menu-settings', /Configura|Settings/i);
    await clickFirstButtonMatching(page, /Backup e restaurar|Backup & restore/i);
    await page.getByRole('button', { name: /Histórico de peso/i }).click();
    return expectOpenDialog(page, {
      kind: 'alert',
      title: /Não foi possível exportar/i,
    });
  }

  test('replaces alert, confirm, and prompt in light/dark desktop and mobile runtimes', async ({ page }) => {
    test.setTimeout(240000);
    await installDialogFixture(page);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');
    const stylesByTheme = {};

    for (const theme of ['light', 'dark']) {
      await setTheme(page, theme);

      const confirmDialog = await openFeedbackConfirm(page);
      await expect(confirmDialog.locator('[data-generic-dialog-primary="true"]')).toBeFocused();
      const feedbackButton = page.getByRole('button', { name: /Enviar feedback/i });
      await page.keyboard.press('Escape');
      await expect(confirmDialog).toHaveCount(0);
      await expect(page.locator('#root')).not.toHaveAttribute('aria-hidden', 'true');
      await expect(feedbackButton).toBeFocused();
      // The open header menu intentionally places its backdrop above the gear;
      // close it through the same outside-click interaction available to users.
      await page.mouse.click(8, 8);
      await expect(feedbackButton).toBeHidden();

      const promptDialog = await openWaterPrompt(page);
      const input = promptDialog.locator('[data-generic-dialog-input="true"]');
      const primary = promptDialog.locator('[data-generic-dialog-primary="true"]');
      await expect(input).toBeFocused();
      await expect(input).toHaveAttribute('inputmode', 'decimal');
      await expect(primary).toBeDisabled();
      await input.fill('750');
      await expect(primary).toBeEnabled();
      await page.keyboard.press('Escape');
      await expect(promptDialog).toHaveCount(0);

      const dangerDialog = await openDeleteConfirm(page);
      const dangerPrimary = dangerDialog.locator('[data-generic-dialog-primary="true"]');
      await expect(dangerPrimary).toHaveText('Excluir');
      await dangerDialog.locator('[data-generic-dialog-cancel="true"]').click();
      await expect(dangerDialog).toHaveCount(0);

      const alertDialog = await openExportAlert(page);
      await expect(alertDialog.locator('[data-generic-dialog-cancel="true"]')).toHaveCount(0);
      await expect(alertDialog.getByText('Falha visual controlada')).toBeVisible();

      stylesByTheme[theme] = await alertDialog.evaluate(dialog => {
        const overlay = dialog.closest('[data-generic-dialog-overlay="true"]');
        const icon = dialog.querySelector('[data-generic-dialog-icon="true"]');
        const primaryButton = dialog.querySelector('[data-generic-dialog-primary="true"]');
        const dialogStyle = getComputedStyle(dialog);
        return {
          background: dialogStyle.backgroundColor,
          border: dialogStyle.borderColor,
          radius: dialogStyle.borderRadius,
          backdrop: dialogStyle.backdropFilter || dialogStyle.webkitBackdropFilter,
          overlayBackground: getComputedStyle(overlay).backgroundColor,
          iconColor: getComputedStyle(icon).color,
          primaryBackground: getComputedStyle(primaryButton).backgroundColor,
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      expect(stylesByTheme[theme].radius).toBe('28px');
      expect(stylesByTheme[theme].backdrop).not.toBe('none');
      expect(stylesByTheme[theme].scrollWidth).toBe(stylesByTheme[theme].viewportWidth);
      await alertDialog.locator('[data-generic-dialog-primary="true"]').click();
      await expect(alertDialog).toHaveCount(0);
    }

    expect(stylesByTheme.light.background).not.toBe(stylesByTheme.dark.background);
    expect(stylesByTheme.light.border).not.toBe(stylesByTheme.dark.border);
    expect(stylesByTheme.light.overlayBackground).not.toBe(stylesByTheme.dark.overlayBackground);
    const controlledExportErrors = errors.filter(error => /Export error.*Falha visual controlada/i.test(error));
    expect(controlledExportErrors).toHaveLength(2);
    await expectNoCriticalErrors(errors.filter(error => !controlledExportErrors.includes(error)));
  });
});
