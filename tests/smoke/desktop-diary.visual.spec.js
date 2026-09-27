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

test.describe('D2 desktop Diary composition', () => {
  test.skip(!hasCredentials, missingCredentialsMessage);
  test.use({ storageState: AUTH_STATE_PATH });

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

  async function seekDiaryState(page, target) {
    const matches = async () => {
      const meals = await page.locator('[data-diary-meal-card="true"]:visible').count();
      const empty = await page.locator('[data-diary-global-add="empty-day"]:visible').count();
      return target === 'filled' ? meals > 0 : empty > 0 && meals === 0;
    };
    if (await matches()) return;
    for (let offset = 0; offset < 31; offset += 1) {
      await page.locator('[data-diary-date-primary="true"] button').first().click();
      await page.waitForTimeout(120);
      if (await matches()) return;
    }
    throw new Error(`desktop-diary-state-not-found:${target}`);
  }

  async function expectDesktopGeometry(page, state) {
    const geometry = await page.evaluate(() => {
      const metrics = document.querySelector('[data-diary-metrics="true"]');
      const screen = document.querySelector('[data-screen="diario"]');
      const navigation = document.querySelector('[data-app-nav="true"]');
      const cards = Array.from(document.querySelectorAll('[data-metric-category]'))
        .filter(node => getComputedStyle(node).display !== 'none');
      const rects = cards.map(node => {
        const rect = node.getBoundingClientRect();
        return {
          key: node.getAttribute('data-metric-category'),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          icon: Boolean(node.querySelector('[data-metric-icon]')),
        };
      });
      const overlaps = rects.some((left, index) => rects.slice(index + 1).some(right =>
        left.left < right.right && left.right > right.left
        && left.top < right.bottom && left.bottom > right.top
      ));
      const metricRect = metrics?.getBoundingClientRect();
      const navRect = navigation?.getBoundingClientRect();
      const mealRect = document.querySelector('[data-diary-meal-card="true"]')?.getBoundingClientRect();
      const waterRect = document.querySelector('[data-water-block="true"]')?.getBoundingClientRect();
      return {
        keys: rects.map(item => item.key),
        icons: rects.every(item => item.icon),
        overlaps,
        metricsPosition: metrics && getComputedStyle(metrics).position,
        metricColumns: metrics && getComputedStyle(metrics).gridTemplateColumns.split(' ').length,
        screenColumns: screen && getComputedStyle(screen).gridTemplateColumns,
        navBottom: navRect?.bottom,
        metricsTop: metricRect?.top,
        mealLeft: mealRect?.left ?? null,
        waterLeft: waterRect?.left ?? null,
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(geometry.keys).toEqual(['kcal', 'protein', 'carbs', 'water']);
    expect(geometry.icons).toBe(true);
    expect(geometry.overlaps).toBe(false);
    expect(geometry.metricsPosition).toBe('static');
    expect(geometry.metricColumns).toBe(4);
    expect(geometry.screenColumns).not.toBe('none');
    expect(geometry.metricsTop).toBeGreaterThanOrEqual(geometry.navBottom);
    expect(geometry.scrollWidth).toBe(geometry.viewportWidth);
    if (state === 'filled' && geometry.mealLeft != null && geometry.waterLeft != null) {
      expect(geometry.mealLeft).toBeLessThan(geometry.waterLeft);
    }
  }

  test('uses the approved empty and filled layout at 1280, 1440, and 1920px in both themes', async ({ page }) => {
    test.setTimeout(420000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');

    for (const width of [1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ['light', 'dark']) {
        await setTheme(page, theme);
        for (const state of ['filled', 'empty']) {
          const today = page.getByRole('button', { name: 'Hoje', exact: true });
          if (await today.count() && await today.isVisible()) await today.click();
          await seekDiaryState(page, state);
          await expectDesktopGeometry(page, state);
        }
      }
    }

    await expectNoCriticalErrors(errors);
  });

  test('preserves the existing two-card phone summary', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');
    const keys = await page.locator('[data-metric-category]:visible').evaluateAll(nodes =>
      nodes.map(node => node.getAttribute('data-metric-category'))
    );
    expect(keys).toEqual(['protein', 'kcal']);
    await expect(page.locator('[data-metric-icon]')).toHaveCount(0);
    await expectNoCriticalErrors(errors);
  });
});
