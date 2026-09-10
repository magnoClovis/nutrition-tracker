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

test.describe('authenticated desktop shell and navigation geometry', () => {
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

  async function expectAlignedNavigation(page, expectedPlacement) {
    const geometry = await page.evaluate(() => {
      const header = document.querySelector('[data-app-header="true"]');
      const status = document.querySelector('[data-header-status-chip="true"]');
      const navigation = document.querySelector('[data-app-nav="true"]');
      const metricButton = status && Array.from(status.querySelectorAll('button'))
        .find(button => /kg(?:\s|$)/i.test(button.textContent || ''));
      if (!header || !status || !navigation) return null;
      const statusRect = status.getBoundingClientRect();
      const navRect = navigation.getBoundingClientRect();
      const metricRect = metricButton ? metricButton.getBoundingClientRect() : null;
      const navStyle = getComputedStyle(navigation);
      const intersects = (a, b) => Boolean(a && b
        && a.left < b.right && a.right > b.left
        && a.top < b.bottom && a.bottom > b.top);
      return {
        placement: navigation.getAttribute('data-app-nav-placement'),
        navPosition: navStyle.position,
        navMarginTop: navStyle.marginTop,
        status: {
          left: statusRect.left,
          right: statusRect.right,
          bottom: statusRect.bottom,
          width: statusRect.width,
        },
        navigation: {
          left: navRect.left,
          right: navRect.right,
          top: navRect.top,
          width: navRect.width,
        },
        statusOverlap: intersects(statusRect, navRect),
        metricOverlap: intersects(metricRect, navRect),
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry.placement).toBe(expectedPlacement);
    expect(geometry.navPosition).toBe('static');
    expect(geometry.navMarginTop).toBe('14px');
    expect(geometry.statusOverlap).toBe(false);
    expect(geometry.metricOverlap).toBe(false);
    expect(geometry.navigation.top).toBeGreaterThanOrEqual(geometry.status.bottom);
    expect(Math.abs(geometry.navigation.left - geometry.status.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.navigation.right - geometry.status.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.navigation.width - geometry.status.width)).toBeLessThanOrEqual(1);
    expect(geometry.scrollWidth).toBe(geometry.viewportWidth);
  }

  test('keeps full-width navigation below status content at 1280, 1440, and 1920px', async ({ page }) => {
    test.setTimeout(300000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');

    const tabs = [
      ['diario', /Di.rio/i, 'standalone'],
      ['despensa', /Alimentos/i, 'header'],
      ['semana', /Semana/i, 'header'],
      ['metricas', /M.tricas/i, 'header'],
    ];

    for (const width of [1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ['light', 'dark']) {
        await setTheme(page, theme);
        for (const [key, label, placement] of tabs) {
          await clickByTutorialKeyOrText(page, `tab-${key}`, label);
          await expect(page.locator(`[data-tutorial="tab-${key}"]`)).toBeVisible();
          await expectAlignedNavigation(page, placement);
        }
      }
    }

    await expectNoCriticalErrors(errors);
  });
});
