const { test, expect } = require('@playwright/test');

test.describe('I1 branded initial loading', () => {
  const cases = [
    { theme: 'light', language: 'pt', reducedMotion: 'no-preference', copy: /Carregando|Entrando/ },
    { theme: 'dark', language: 'en', reducedMotion: 'no-preference', copy: /Loading|Signing in/ },
    { theme: 'light', language: 'es', reducedMotion: 'reduce', copy: /Cargando|Iniciando sesión/ },
  ];

  for (const scenario of cases) {
    test(`${scenario.theme} ${scenario.language} ${scenario.reducedMotion}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: scenario.reducedMotion });
      await page.addInitScript(({ theme, language }) => {
        localStorage.setItem('appThemeDefaultDarkV1', '1');
        localStorage.setItem('appDarkMode', String(theme === 'dark'));
        localStorage.setItem('appLang', language);
      }, scenario);

      await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
      const loading = page.locator('#loading');
      await expect(loading).toBeVisible();
      await expect(loading).toHaveAttribute('role', 'status');
      await expect(loading).toHaveAttribute('aria-live', 'polite');
      await expect(page.locator('.initial-loading-wordmark')).toHaveText('Trofia');
      await expect(page.locator('#initial-loading-text')).toHaveText(scenario.copy);

      const visual = await page.evaluate(() => {
        const layer = document.querySelector('#loading');
        const mark = document.querySelector('.initial-loading-mark');
        const aura = document.querySelector('.initial-loading-aura');
        const progress = document.querySelector('.initial-loading-progress span');
        const markStyle = getComputedStyle(mark);
        return {
          theme: document.documentElement.dataset.theme,
          background: getComputedStyle(layer).backgroundColor,
          markWidth: Number.parseFloat(markStyle.width),
          markHeight: Number.parseFloat(markStyle.height),
          markAnimation: getComputedStyle(mark).animationName,
          auraAnimation: getComputedStyle(aura).animationName,
          progressAnimation: getComputedStyle(progress).animationName,
          startedAt: window.initialLoadingStartedAt,
          minimum: window.INITIAL_LOADING_MIN_MS,
        };
      });

      expect(visual.theme).toBe(scenario.theme);
      expect(visual.background).not.toBe('rgba(0, 0, 0, 0)');
      expect(visual.markWidth).toBe(82);
      expect(visual.markHeight).toBe(82);
      expect(visual.minimum).toBe(900);
      if (scenario.reducedMotion === 'reduce') {
        expect(visual.markAnimation).toBe('none');
        expect(visual.auraAnimation).toBe('none');
        expect(visual.progressAnimation).toBe('none');
      } else {
        expect(visual.markAnimation).toContain('initialLoadingMarkIn');
        expect(visual.auraAnimation).toContain('initialLoadingAuraIn');
        expect(visual.progressAnimation).toContain('initialLoadingProgress');
      }

      await page.evaluate(() => window.hideInitialLoading());
      await expect(loading).toHaveCount(0, { timeout: 5000 });
      const removedAt = await page.evaluate(() => performance.now());
      expect(removedAt - visual.startedAt).toBeGreaterThanOrEqual(900);
    });
  }
});
