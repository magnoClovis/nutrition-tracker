const { test, expect } = require('@playwright/test');

test.describe('embedded camera release hotfix CSS contract', () => {
  for (const theme of ['light', 'dark']) {
    test(`${theme} keeps the native viewport transparent and locks only settled geometry`, async ({ page }) => {
      await page.goto('index.html', { waitUntil: 'domcontentloaded' });
      await page.evaluate((themeName) => {
        document.documentElement.dataset.theme = themeName;
        document.body.innerHTML = `
          <div data-one-ui-root data-theme="${themeName}">
            <main data-app-main="adicionar" style="position:fixed;inset:7vh 12px;overflow-y:auto">
              <div style="height:540px"></div>
              <section data-image-meal-screen="true" data-camera-native-active="true">
                <div data-embedded-camera="true">
                  <div data-embedded-camera-surface="true"></div>
                  <div data-camera-controls="true">
                    <button data-camera-cancel="true">Cancelar</button>
                    <button data-camera-shutter="true">Capturar foto</button>
                  </div>
                </div>
              </section>
            </main>
          </div>`;
      }, theme);

      const stylesBeforeLock = await page.evaluate(() => {
        const root = document.querySelector('[data-one-ui-root]');
        const main = document.querySelector('[data-app-main="adicionar"]');
        return {
          htmlBackground: getComputedStyle(document.documentElement).backgroundColor,
          bodyBackground: getComputedStyle(document.body).backgroundColor,
          bodyImage: getComputedStyle(document.body).backgroundImage,
          rootBackground: getComputedStyle(root).backgroundColor,
          rootImage: getComputedStyle(root).backgroundImage,
          mainBackground: getComputedStyle(main).backgroundColor,
          mainImage: getComputedStyle(main).backgroundImage,
          mainOverflowY: getComputedStyle(main).overflowY,
        };
      });

      expect(stylesBeforeLock).toMatchObject({
        htmlBackground: 'rgba(0, 0, 0, 0)',
        bodyBackground: 'rgba(0, 0, 0, 0)',
        bodyImage: 'none',
        rootBackground: 'rgba(0, 0, 0, 0)',
        rootImage: 'none',
        mainBackground: 'rgba(0, 0, 0, 0)',
        mainImage: 'none',
        mainOverflowY: 'auto',
      });

      const main = page.locator('[data-app-main="adicionar"]');
      await main.evaluate(element => { element.scrollTop = element.scrollHeight; });
      await expect(page.locator('[data-camera-cancel="true"]')).toBeInViewport();
      await expect(page.locator('[data-camera-shutter="true"]')).toBeInViewport();

      await page.locator('[data-embedded-camera="true"]').evaluate(element => {
        element.dataset.cameraGeometryReady = 'true';
      });
      await expect(main).toHaveCSS('overflow-y', 'hidden');
      await expect(page.locator('[data-camera-cancel="true"]')).toBeInViewport();
      await expect(page.locator('[data-camera-shutter="true"]')).toBeInViewport();
    });
  }
});
