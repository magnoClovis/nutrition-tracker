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

test.describe('authenticated NumericField visual contract', () => {
  test.skip(!hasCredentials, missingCredentialsMessage);
  test.use({ storageState: AUTH_STATE_PATH });

  const food = {
    id: 'numeric-field-food',
    name: 'Aveia visual',
    unit: 'g',
    protein100: 13,
    kcal100: 389,
    carbs100: 66,
    fat100: 7,
  };

  async function installPantryFixture(page) {
    await page.addInitScript(initialFood => {
      let installedStorage;
      let pantry = JSON.stringify([initialFood]);
      function decorateStorage(storage) {
        if (!storage || storage.__numericFieldFixture) return storage;
        const originalGet = storage.get.bind(storage);
        const originalSet = storage.set.bind(storage);
        storage.get = async key => key === 'pantry_v2' ? { value: pantry } : originalGet(key);
        storage.set = async (key, value) => {
          if (key === 'pantry_v2') { pantry = value; return true; }
          return originalSet(key, value);
        };
        Object.defineProperty(storage, '__numericFieldFixture', { value: true });
        return storage;
      }
      Object.defineProperty(window, 'storage', {
        configurable: true,
        get: () => installedStorage,
        set: value => { installedStorage = decorateStorage(value); },
      });
    }, food);
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

  async function openQuantityField(page) {
    const addButton = page.locator(
      '[data-diary-global-add]:visible [data-tutorial="open-log-sheet"]'
    ).first();
    await expect(addButton).toBeVisible();
    await addButton.evaluate(button => button.click());
    const addScreen = page.locator('[data-app-main="adicionar"]:visible');
    await expect(addScreen).toBeVisible();
    const foodSearch = addScreen.locator([
      'input[placeholder*="Pesquisar alimento"]:visible',
      'input[placeholder*="Search food"]:visible',
      'input[placeholder*="Buscar alimento"]:visible',
    ].join(', '));
    await foodSearch.fill(food.name);
    await addScreen.getByText(food.name, { exact: true }).last().click();
    const trigger = page.locator('#meal-food-quantity-trigger');
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.locator('[data-numeric-field-sheet="true"]')).toBeVisible();
    return trigger;
  }

  test('renders and edits decimal food quantity in light/dark on desktop and mobile', async ({ page }) => {
    test.setTimeout(120000);
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

    for (const [viewport, theme] of cases) {
      await page.setViewportSize(viewport);
      await setTheme(page, theme);
      const trigger = await openQuantityField(page);
      await expect(page.locator('[data-app-main="adicionar"] input[type="number"]:visible')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Informar quantidade', exact: true })).toBeVisible();

      const styles = await page.evaluate(() => {
        const triggerNode = document.querySelector('#meal-food-quantity-trigger');
        const sheetNode = document.querySelector('[data-numeric-field-sheet="true"]');
        const valueNode = document.querySelector('[data-numeric-keypad-value="true"]');
        const sheetStyle = getComputedStyle(sheetNode);
        const valueStyle = getComputedStyle(valueNode);
        return {
          triggerBackground: getComputedStyle(triggerNode).backgroundColor,
          sheetRadius: sheetStyle.borderTopLeftRadius,
          sheetBackdrop: sheetStyle.backdropFilter || sheetStyle.webkitBackdropFilter,
          valueBackground: valueStyle.backgroundColor,
          valueColor: valueStyle.color,
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      expect(styles.sheetRadius).toBe('28px');
      expect(styles.sheetBackdrop).not.toBe('none');
      expect(styles.scrollWidth).toBe(styles.viewportWidth);
      if (theme === 'light') {
        expect(styles.triggerBackground).toBe('rgb(247, 246, 242)');
        expect(styles.valueBackground).toBe('rgb(234, 243, 222)');
        expect(styles.valueColor).toBe('rgb(39, 80, 10)');
      } else {
        expect(styles.triggerBackground).toBe('rgb(38, 38, 36)');
        expect(styles.valueBackground).toBe('rgb(23, 52, 4)');
        expect(styles.valueColor).toBe('rgb(151, 196, 89)');
      }

      for (const digit of ['1', '2', '5']) {
        await page.getByRole('button', { name: digit, exact: true }).click();
      }
      await page.locator('[data-numeric-keypad-decimal="true"]').click();
      await page.getByRole('button', { name: '5', exact: true }).click();
      await page.locator('[data-numeric-keypad-confirm="true"]').click();
      await expect(page.locator('[data-numeric-field-sheet="true"]')).toHaveCount(0);
      await expect(trigger).toContainText('125,5');
      await expect(trigger).toContainText('g');
      await page.locator('[data-add-close]').click();
    }

    await expectNoCriticalErrors(errors);
  });

  test('takes keypad labels from PT, EN, and ES app language', async ({ page }) => {
    test.setTimeout(90000);
    await installPantryFixture(page);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    const languages = [
      ['pt', 'Informar quantidade', 'Separador decimal'],
      ['en', 'Enter quantity', 'Decimal separator'],
      ['es', 'Indicar cantidad', 'Separador decimal'],
    ];

    for (const [language, title, decimalLabel] of languages) {
      await setAppLanguage(page, language);
      await openQuantityField(page);
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: decimalLabel, exact: true })).toBeVisible();
      await page.getByRole('button', { name: /Cancelar|Cancel/ }).click();
      await page.locator('[data-add-close]').click();
    }

    await expectNoCriticalErrors(errors);
  });
});
