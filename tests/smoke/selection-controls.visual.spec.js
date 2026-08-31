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

test.describe('authenticated CheckboxField and SliderField visual contract', () => {
  test.skip(!hasCredentials, missingCredentialsMessage);
  test.use({ storageState: AUTH_STATE_PATH });

  const pantry = JSON.stringify([
    { id: 's8-rice', name: 'Arroz integral', unit: 'g', protein100: 2.6, kcal100: 124 },
    { id: 's8-chicken', name: 'Frango grelhado', unit: 'g', protein100: 31, kcal100: 165 },
    { id: 's8-broccoli', name: 'Brócolis', unit: 'g', protein100: 2.8, kcal100: 34 },
  ]);

  async function installPantryFixture(page) {
    await page.addInitScript(initialPantry => {
      let installedStorage;
      let pantryState = initialPantry;
      function decorateStorage(storage) {
        if (!storage || storage.__selectionControlsFixture) return storage;
        const originalGet = storage.get.bind(storage);
        const originalSet = storage.set.bind(storage);
        storage.get = async key => key === 'pantry_v2' ? { value: pantryState } : originalGet(key);
        storage.set = async (key, value) => {
          if (key === 'pantry_v2') { pantryState = value; return true; }
          return originalSet(key, value);
        };
        Object.defineProperty(storage, '__selectionControlsFixture', { value: true });
        return storage;
      }
      Object.defineProperty(window, 'storage', {
        configurable: true,
        get: () => installedStorage,
        set: value => { installedStorage = decorateStorage(value); },
      });
    }, pantry);
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

  async function openMealSuggestionControls(page, diaryLabel = /Di.rio|Diary/i) {
    await clickByTutorialKeyOrText(page, 'tab-diario', diaryLabel);
    const openButton = page.locator('[data-tutorial="suggest-meal-button"]:visible').first();
    await expect(openButton).toBeVisible();
    await openButton.click();
    await expect(page.locator('#ga-use-all-pantry-foods')).toBeAttached();
    return page.locator('[data-diary-suggestion-block="true"]:visible').first();
  }

  async function exposeEveryControl(page, suggestionBlock) {
    const useAll = suggestionBlock.locator('#ga-use-all-pantry-foods');
    await useAll.focus();
    await page.keyboard.press('Space');
    await expect(useAll).not.toBeChecked();
    await expect(suggestionBlock.locator('#ga-food-s8-rice')).toBeAttached();

    await suggestionBlock.getByRole('button', { name: /Ajustes avançados|Advanced optional adjustments|Ajustes avanzados/ }).click();
    const proteinToggle = suggestionBlock.locator('#ga-protein-flexibility-toggle');
    await proteinToggle.focus();
    await page.keyboard.press('Space');
    await expect(proteinToggle).toBeChecked();
    await expect(suggestionBlock.locator('#ga-protein-flexibility-slider')).toBeAttached();
  }

  test('keeps one rounded-square checkbox and themed native sliders in every visual matrix cell', async ({ page }) => {
    test.setTimeout(240000);
    await installPantryFixture(page);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');

    const cases = [
      [{ width: 1280, height: 850 }, 'light'],
      [{ width: 1280, height: 850 }, 'dark'],
      [{ width: 390, height: 844 }, 'light'],
      [{ width: 390, height: 844 }, 'dark'],
    ];
    const stylesByTheme = {};

    for (const [viewport, theme] of cases) {
      await page.setViewportSize(viewport);
      await setTheme(page, theme);
      const suggestionBlock = await openMealSuggestionControls(page);
      await exposeEveryControl(page, suggestionBlock);

      const useAll = suggestionBlock.locator('#ga-use-all-pantry-foods');
      const rice = suggestionBlock.locator('#ga-food-s8-rice');
      const proteinToggle = suggestionBlock.locator('#ga-protein-flexibility-toggle');
      const mealSize = suggestionBlock.locator('#ga-meal-size-slider');
      const proteinSlider = suggestionBlock.locator('#ga-protein-flexibility-slider');

      await expect(useAll).toHaveAttribute('type', 'checkbox');
      await expect(rice).toHaveAttribute('type', 'checkbox');
      await expect(proteinToggle).toHaveAttribute('type', 'checkbox');
      await expect(mealSize).toHaveAttribute('type', 'range');
      await expect(mealSize).toHaveAttribute('min', '-40');
      await expect(mealSize).toHaveAttribute('max', '40');
      await expect(proteinSlider).toHaveAttribute('min', '5');
      await expect(proteinSlider).toHaveAttribute('max', '50');

      const styles = await suggestionBlock.evaluate(block => {
        const marks = Array.from(block.querySelectorAll('[data-checkbox-field-mark="true"]'));
        const mealRange = block.querySelector('#ga-meal-size-slider');
        const proteinRange = block.querySelector('#ga-protein-flexibility-slider');
        return {
          marks: marks.map(mark => {
            const css = getComputedStyle(mark);
            return {
              width: css.width,
              height: css.height,
              radius: css.borderRadius,
              background: css.backgroundColor,
            };
          }),
          mealProgress: getComputedStyle(mealRange).getPropertyValue('--slider-field-progress').trim(),
          proteinProgress: getComputedStyle(proteinRange).getPropertyValue('--slider-field-progress').trim(),
          mealAccent: getComputedStyle(mealRange).accentColor,
          proteinAccent: getComputedStyle(proteinRange).accentColor,
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      expect(styles.marks.length).toBeGreaterThanOrEqual(5);
      for (const mark of styles.marks) {
        expect(mark.width).toBe('24px');
        expect(mark.height).toBe('24px');
        expect(mark.radius).toBe('7px');
      }
      expect(styles.mealProgress).toMatch(/%$/);
      expect(styles.proteinProgress).toMatch(/%$/);
      expect(styles.mealAccent).not.toBe(styles.proteinAccent);
      expect(styles.scrollWidth).toBe(styles.viewportWidth);
      stylesByTheme[theme] = styles.marks.map(mark => mark.background);

      await mealSize.focus();
      const before = Number(await mealSize.inputValue());
      await page.keyboard.press('ArrowRight');
      await expect(mealSize).toHaveValue(String(before + 1));
      await expect(mealSize).toHaveAttribute('aria-valuetext', /% · \d+ kcal/);

      await proteinSlider.fill('35');
      await expect(proteinSlider).toHaveValue('35');
      await expect(proteinSlider).toHaveAttribute('aria-valuetext', '35%');
    }

    expect(stylesByTheme.light).not.toEqual(stylesByTheme.dark);
    await expectNoCriticalErrors(errors);
  });

  test('uses the app language for control labels in PT, EN, and ES', async ({ page }) => {
    test.setTimeout(180000);
    await installPantryFixture(page);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    const languages = [
      ['pt', /Di.rio/i, 'Usar todos os alimentos da despensa automaticamente.', 'Ajuste fino do tamanho'],
      ['en', /Diary/i, 'Use all pantry foods automatically.', 'Fine-tune meal size'],
      ['es', /Diario/i, 'Usar todos los alimentos de la despensa automáticamente.', 'Ajuste fino del tamaño'],
    ];

    for (const [language, diaryLabel, checkboxLabel, sliderLabel] of languages) {
      await setAppLanguage(page, language);
      const suggestionBlock = await openMealSuggestionControls(page, diaryLabel);
      await suggestionBlock.getByRole('button', { name: /Ajustes avançados|Advanced optional adjustments|Ajustes avanzados/ }).click();
      await expect(suggestionBlock.getByRole('checkbox', { name: checkboxLabel })).toBeAttached();
      await expect(suggestionBlock.getByRole('slider', { name: sliderLabel })).toBeAttached();
    }

    await expectNoCriticalErrors(errors);
  });
});
