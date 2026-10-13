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

test.describe('I8-A Foods shell visual contract', () => {
  test.skip(!hasCredentials, missingCredentialsMessage);
  test.use({ storageState: AUTH_STATE_PATH });

  async function setTheme(page, theme) {
    await page.evaluate(nextTheme => {
      localStorage.setItem('appThemePolicyVersion', '2');
      localStorage.setItem('appThemePreference', nextTheme);
    }, theme);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
    await dismissTutorialIfVisible(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  }

  async function openFoods(page) {
    await clickByTutorialKeyOrText(page, 'tab-despensa', /Foods|Alimentos/i);
    await expect(page.locator('[data-screen="despensa"]')).toBeVisible();
  }

  test('matches the approved responsive shell, tab and search states in both themes', async ({ page }) => {
    test.setTimeout(120000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'en');

    const cases = [
      [{ width: 390, height: 844 }, 'light'],
      [{ width: 390, height: 844 }, 'dark'],
      [{ width: 1280, height: 850 }, 'light'],
      [{ width: 1280, height: 850 }, 'dark'],
    ];

    for (const [viewport, theme] of cases) {
      await page.setViewportSize(viewport);
      await setTheme(page, theme);
      await openFoods(page);

      const screen = page.locator('[data-screen="despensa"]');
      const search = screen.locator('.pantry-library-search');
      const tabs = screen.locator('[role="tab"]');
      await expect(screen.getByRole('heading', { name: 'Foods', exact: true })).toBeVisible();
      await expect(screen.getByRole('button', { name: '+ New', exact: true })).toBeVisible();
      await expect(search).toBeVisible();
      await expect(tabs).toHaveCount(4);
      await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
      await expect(screen.locator('[data-pantry-filter]')).toHaveCount(4);

      const geometry = await screen.evaluate(node => {
        const searchNode = node.querySelector('.pantry-library-search');
        const tabNode = node.querySelector('.pantry-library-tabs [role="tab"]');
        return {
          searchHeight: searchNode?.getBoundingClientRect().height || 0,
          searchRadius: getComputedStyle(searchNode).borderRadius,
          tabHeight: tabNode?.getBoundingClientRect().height || 0,
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      expect(geometry.searchHeight).toBeGreaterThanOrEqual(50);
      expect(geometry.searchRadius).toBe('16px');
      expect(geometry.tabHeight).toBeGreaterThanOrEqual(40);
      expect(geometry.scrollWidth).toBe(geometry.viewportWidth);

      await tabs.filter({ hasText: 'Categories' }).click();
      await expect(screen).toHaveAttribute('data-pantry-view', 'categories');
      await expect(screen.locator('[data-pantry-categories]')).toBeVisible();
      const categoryTiles = screen.locator('[data-pantry-category-tile]');
      if (await categoryTiles.count()) {
        await categoryTiles.first().click();
        await expect(screen.locator('.pantry-category-heading')).toBeVisible();
        await screen.getByRole('button', { name: 'Back' }).click();
        await expect(screen.locator('.pantry-category-grid')).toBeVisible();
      }

      const searchInput = search.getByRole('textbox', { name: 'Search your foods and the database' });
      await searchInput.fill('__i8_no_match__');
      await expect(screen).toHaveAttribute('data-pantry-search-mode', 'true');
      await expect(tabs).toHaveCount(0);
      await expect(screen.getByText('In your library')).toBeVisible();
      await expect(screen.getByText('No results')).toBeVisible();
      await screen.getByRole('button', { name: 'Clear search' }).click();
      await expect(screen).toHaveAttribute('data-pantry-search-mode', 'false');
      await expect(screen.locator('[role="tab"]')).toHaveCount(4);
    }

    await expectNoCriticalErrors(errors);
  });

  test('takes the shell, tabs, filters and category copy from PT, EN and ES', async ({ page }) => {
    test.setTimeout(90000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    const languages = [
      { code: 'pt', title: 'Alimentos', meals: 'Refeições', categories: 'Categorias', all: 'Todos' },
      { code: 'en', title: 'Foods', meals: 'Meals', categories: 'Categories', all: 'All' },
      { code: 'es', title: 'Alimentos', meals: 'Comidas', categories: 'Categorías', all: 'Todos' },
    ];

    for (const language of languages) {
      await setAppLanguage(page, language.code);
      await openFoods(page);
      const screen = page.locator('[data-screen="despensa"]');
      await expect(screen.getByRole('heading', { name: language.title, exact: true })).toBeVisible();
      await expect(screen.getByRole('tab', { name: language.meals, exact: true })).toBeVisible();
      await expect(screen.getByRole('tab', { name: language.categories, exact: true })).toBeVisible();
      await expect(screen.getByRole('button', { name: language.all, exact: true })).toBeVisible();
    }

    await expectNoCriticalErrors(errors);
  });
});
