const { test, expect } = require('@playwright/test');

test.describe('embedded camera release hotfix CSS contract', () => {
  for (const theme of ['light', 'dark']) {
    test(`${theme} keeps the native viewport transparent and locks only settled geometry`, async ({ page }) => {
      await page.goto('index.html', { waitUntil: 'domcontentloaded' });
      await page.evaluate((themeName) => {
        document.documentElement.dataset.theme = themeName;
        document.body.innerHTML = `
          <div data-one-ui-root data-theme="${themeName}">
            <div data-camera-obscured-content="root">Conteúdo do app atrás da câmera</div>
            <main data-app-main="adicionar" style="position:fixed;inset:7vh 12px;overflow-y:auto;animation:softIn 220ms ease-out both;backdrop-filter:blur(12px)">
              <div data-camera-obscured-content="modal">Conteúdo do modal atrás da câmera</div>
              <div style="height:540px"></div>
              <section data-image-meal-screen="true" data-camera-native-active="true">
                <div data-camera-stage-overlay="true">
                  <div data-camera-backdrop-pane="top"></div><div data-camera-backdrop-pane="left"></div>
                  <div data-camera-backdrop-pane="right"></div><div data-camera-backdrop-pane="bottom"></div>
                  <div data-camera-stage-viewport="true" data-embedded-camera="true">
                    <div data-embedded-camera-surface="true"></div>
                    <span data-camera-corner="top-left"></span><span data-camera-corner="top-right"></span>
                    <span data-camera-corner="bottom-left"></span><span data-camera-corner="bottom-right"></span>
                    <button data-camera-flash="true" data-camera-flash-state="off" aria-pressed="false">
                      <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M13.5 2.75 6.75 12h4.6l-.85 9.25L17.25 11h-4.6l.85-8.25Z"></path></svg>
                      <span>Flash off</span>
                    </button>
                    <button data-camera-close="true">Fechar câmera</button>
                  </div>
                  <div data-camera-controls="true"><button data-camera-shutter="true">Capturar foto</button></div>
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

      const stageMetrics = await page.evaluate(() => {
        const overlay = document.querySelector('[data-camera-stage-overlay="true"]');
        const viewport = document.querySelector('[data-camera-stage-viewport="true"]');
        const pane = document.querySelector('[data-camera-backdrop-pane="top"]');
        const rect = viewport.getBoundingClientRect();
        return {
          overlayPosition: getComputedStyle(overlay).position,
          centerDelta: Math.abs((rect.left + rect.width / 2) - (innerWidth / 2)),
          borderRadius: parseFloat(getComputedStyle(viewport).borderRadius),
          backdropFilter: getComputedStyle(pane).backdropFilter,
          openingAnimation: getComputedStyle(viewport).animationName,
        };
      });
      expect(stageMetrics.overlayPosition).toBe('fixed');
      expect(stageMetrics.centerDelta).toBeLessThanOrEqual(0.5);
      expect(stageMetrics.borderRadius).toBeGreaterThanOrEqual(32);
      expect(stageMetrics.backdropFilter).toContain('blur(18px)');
      expect(stageMetrics.openingAnimation).toContain('embeddedCameraOpen');
      await expect(page.locator('[data-app-main="adicionar"]')).toHaveCSS('animation-name', 'none');
      await expect(page.locator('[data-app-main="adicionar"]')).toHaveCSS('backdrop-filter', 'none');
      await expect(page.locator('[data-camera-obscured-content="root"]')).toHaveCSS('visibility', 'hidden');
      await expect(page.locator('[data-camera-obscured-content="modal"]')).toHaveCSS('visibility', 'hidden');
      await expect(page.locator('[data-camera-stage-overlay="true"]')).toHaveCSS('visibility', 'visible');
      await expect(page.locator('[data-camera-close="true"]')).toHaveCSS('visibility', 'visible');

      const flashMetrics = await page.locator('[data-camera-flash="true"]').evaluate(element => {
        const viewport = document.querySelector('[data-camera-stage-viewport="true"]');
        const close = document.querySelector('[data-camera-close="true"]');
        const corner = document.querySelector('[data-camera-corner="top-left"]');
        const buttonRect = element.getBoundingClientRect();
        const closeRect = close.getBoundingClientRect();
        const viewportRect = viewport.getBoundingClientRect();
        const offStyle = getComputedStyle(element);
        const cornerStyle = getComputedStyle(corner);
        const off = {
          minHeight: parseFloat(offStyle.minHeight),
          height: buttonRect.height,
          closeHeight: closeRect.height,
          borderRadius: parseFloat(offStyle.borderRadius),
          background: offStyle.backgroundColor,
          glyphFill: getComputedStyle(element.querySelector('path')).fill,
          cornerWidth: parseFloat(cornerStyle.width),
          cornerBackground: cornerStyle.backgroundImage,
          withinLeft: buttonRect.left >= viewportRect.left,
          withinTop: buttonRect.top >= viewportRect.top,
        };
        return off;
      });
      expect(flashMetrics.minHeight).toBeGreaterThanOrEqual(48);
      expect(Math.abs(flashMetrics.height - flashMetrics.closeHeight)).toBeLessThanOrEqual(0.5);
      expect(flashMetrics.borderRadius).toBeGreaterThanOrEqual(24);
      expect(flashMetrics.glyphFill).not.toBe('none');
      expect(flashMetrics.cornerWidth).toBeGreaterThanOrEqual(32);
      expect(flashMetrics.cornerBackground).toContain('radial-gradient');
      expect(flashMetrics.cornerBackground).toContain('rgb(6, 16, 13)');
      expect(flashMetrics.cornerBackground).not.toContain('rgba(6, 16, 13, 0.94)');
      expect(flashMetrics.withinLeft).toBe(true);
      expect(flashMetrics.withinTop).toBe(true);
      await page.locator('[data-camera-flash="true"]').evaluate(element => {
        element.setAttribute('data-camera-flash-state', 'on');
      });
      await expect(page.locator('[data-camera-flash="true"]')).toHaveCSS('background-color', 'rgb(255, 200, 109)');
      const flashOnBackground = await page.locator('[data-camera-flash="true"]').evaluate(
        element => getComputedStyle(element).backgroundColor,
      );
      expect(flashMetrics.background).not.toBe(flashOnBackground);

      const closingAnimations = await page.evaluate(() => {
        const overlay = document.querySelector('[data-camera-stage-overlay="true"]');
        const viewport = document.querySelector('[data-camera-stage-viewport="true"]');
        overlay.dataset.cameraStageClosing = 'true';
        return {
          overlay: getComputedStyle(overlay).animationName,
          viewport: getComputedStyle(viewport).animationName,
        };
      });
      expect(closingAnimations.overlay).toContain('cameraStageBackdropOut');
      expect(closingAnimations.viewport).toContain('cameraStageClose');
      await page.locator('[data-camera-stage-overlay="true"]').evaluate(element => {
        delete element.dataset.cameraStageClosing;
      });

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.locator('[data-camera-stage-overlay="true"]')).toHaveCSS('animation-name', 'none');
      await expect(page.locator('[data-camera-stage-viewport="true"]')).toHaveCSS('animation-name', 'none');

      const main = page.locator('[data-app-main="adicionar"]');
      await main.evaluate(element => { element.scrollTop = element.scrollHeight; });
      await expect(page.locator('[data-camera-close="true"]')).toBeInViewport();
      await expect(page.locator('[data-camera-shutter="true"]')).toBeInViewport();

      await page.locator('[data-embedded-camera="true"]').evaluate(element => {
        element.dataset.cameraGeometryReady = 'true';
      });
      await expect(main).toHaveCSS('overflow-y', 'hidden');
      await expect(page.locator('[data-camera-close="true"]')).toBeInViewport();
      await expect(page.locator('[data-camera-shutter="true"]')).toBeInViewport();
    });

    test(`${theme} frozen photo covers the native viewport before shutdown`, async ({ page }) => {
      await page.goto('index.html', { waitUntil: 'domcontentloaded' });
      await page.evaluate((themeName) => {
        document.documentElement.dataset.theme = themeName;
        document.body.innerHTML = `
          <div data-one-ui-root data-theme="${themeName}">
            <main data-app-main="adicionar">
              <section data-image-meal-screen="true" data-camera-native-active="true" data-camera-geometry-locked="true">
                <div data-camera-stage-overlay="true" data-image-meal-state="camera-frozen">
                  <div data-camera-stage-viewport="true" data-embedded-camera="true" data-image-meal-state="camera-frozen">
                    <div data-embedded-camera-surface="true"></div>
                    <img
                    data-camera-frozen-photo="true"
                    alt="Foto congelada"
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500'%3E%3Crect width='400' height='500' fill='%231d6b57'/%3E%3C/svg%3E"
                    >
                  </div>
                </div>
              </section>
            </main>
          </div>`;
      }, theme);

      const frozen = page.locator('[data-camera-frozen-photo="true"]');
      await expect(frozen).toBeVisible();
      const metrics = await page.evaluate(() => {
        const surface = document.querySelector('[data-embedded-camera-surface="true"]');
        const image = document.querySelector('[data-camera-frozen-photo="true"]');
        const surfaceRect = surface.getBoundingClientRect();
        const imageRect = image.getBoundingClientRect();
        const style = getComputedStyle(image);
        return {
          deltaLeft: Math.abs(surfaceRect.left - imageRect.left),
          deltaTop: Math.abs(surfaceRect.top - imageRect.top),
          deltaWidth: Math.abs(surfaceRect.width - imageRect.width),
          deltaHeight: Math.abs(surfaceRect.height - imageRect.height),
          position: style.position,
          opacity: style.opacity,
          zIndex: style.zIndex,
          bodyBackground: getComputedStyle(document.body).backgroundColor,
        };
      });
      expect(metrics.deltaLeft).toBeLessThanOrEqual(0.5);
      expect(metrics.deltaTop).toBeLessThanOrEqual(0.5);
      expect(metrics.deltaWidth).toBeLessThanOrEqual(0.5);
      expect(metrics.deltaHeight).toBeLessThanOrEqual(0.5);
      expect(metrics).toMatchObject({
        position: 'absolute',
        opacity: '1',
        zIndex: '2',
        bodyBackground: 'rgba(0, 0, 0, 0)',
      });
    });

    test(`${theme} analysis keeps the photo full-screen and unblurred with a fixed cancel action`, async ({ page }) => {
      await page.goto('index.html', { waitUntil: 'domcontentloaded' });
      await page.evaluate((themeName) => {
        document.documentElement.dataset.theme = themeName;
        document.documentElement.style.fontSize = '32px';
        document.body.innerHTML = `
          <div data-one-ui-root data-theme="${themeName}">
            <main data-app-main="adicionar" style="height:200vh">
              <div data-image-meal-analysis="true" role="dialog" aria-modal="true">
                <img data-image-meal-analysis-photo="true" aria-hidden="true"
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='800'%3E%3Crect width='400' height='800' fill='%23547149'/%3E%3C/svg%3E">
                <div data-image-meal-analysis-scrim="true"></div>
                <div data-image-meal-analysis-content="true">
                  <div data-image-meal-analysis-status="true" role="status" aria-live="polite">
                    <div data-image-meal-analysis-progress="true"><span></span><span></span><span></span></div>
                    <h2>Analisando a refeição</h2>
                    <p>Identificando o que está no prato</p>
                  </div>
                  <button data-image-meal-cancel="true">Cancelar</button>
                </div>
              </div>
            </main>
          </div>`;
      }, theme);

      await page.locator('[data-image-meal-analysis="true"]').evaluate(element => (
        Promise.all(element.getAnimations().map(animation => animation.finished))
      ));

      const metrics = await page.evaluate(() => {
        const analysis = document.querySelector('[data-image-meal-analysis="true"]');
        const photo = document.querySelector('[data-image-meal-analysis-photo="true"]');
        const scrim = document.querySelector('[data-image-meal-analysis-scrim="true"]');
        const cancel = document.querySelector('[data-image-meal-cancel="true"]');
        const analysisRect = analysis.getBoundingClientRect();
        const cancelRect = cancel.getBoundingClientRect();
        return {
          position: getComputedStyle(analysis).position,
          widthDelta: Math.abs(analysisRect.width - innerWidth),
          heightDelta: Math.abs(analysisRect.height - innerHeight),
          photoFilter: getComputedStyle(photo).filter,
          photoObjectFit: getComputedStyle(photo).objectFit,
          scrimBackdropFilter: getComputedStyle(scrim).backdropFilter,
          bodyOverflow: getComputedStyle(document.body).overflow,
          cancelHeight: cancelRect.height,
          cancelTop: cancelRect.top,
          cancelBottom: cancelRect.bottom,
          viewportHeight: innerHeight,
          cancelPosition: getComputedStyle(cancel).position,
          cancelVisibility: getComputedStyle(cancel).visibility,
          cancelInViewport: cancelRect.top >= 0 && cancelRect.bottom <= innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
        };
      });
      expect(metrics, JSON.stringify(metrics)).toMatchObject({
        position: 'fixed',
        photoFilter: 'none',
        photoObjectFit: 'cover',
        scrimBackdropFilter: 'none',
        bodyOverflow: 'hidden',
        cancelInViewport: true,
      });
      expect(metrics.widthDelta).toBeLessThanOrEqual(0.5);
      expect(metrics.heightDelta).toBeLessThanOrEqual(0.5);
      expect(metrics.cancelHeight).toBeGreaterThanOrEqual(48);
      expect(metrics.scrollWidth).toBe(metrics.viewportWidth);

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.locator('[data-image-meal-analysis="true"]')).toHaveCSS('animation-name', 'none');
      await expect(page.locator('[data-image-meal-analysis-progress="true"] span').first()).toHaveCSS('animation-name', 'none');
    });

    test(`${theme} CAM-RED-6 failures keep the photo, glass card, and actions reachable at 200% text`, async ({ page }) => {
      await page.addInitScript(themeName => {
        localStorage.setItem('appThemeDefaultDarkV1', '1');
        localStorage.setItem('appDarkMode', String(themeName === 'dark'));
      }, theme);
      await page.goto('index.html', { waitUntil: 'domcontentloaded' });
      await page.evaluate((themeName) => {
        document.documentElement.dataset.theme = themeName;
        document.documentElement.style.fontSize = '32px';
        document.body.innerHTML = `
          <div data-one-ui-root data-theme="${themeName}">
            <main data-app-main="adicionar" style="height:200vh">
              <div data-image-meal-analysis="true" data-image-meal-analysis-mode="error"
                   data-image-meal-analysis-error="network-unavailable" role="dialog" aria-modal="true">
                <img data-image-meal-analysis-photo="true" aria-hidden="true"
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='800'%3E%3Crect width='400' height='800' fill='%23547149'/%3E%3C/svg%3E">
                <div data-image-meal-analysis-scrim="true"></div>
                <div data-image-meal-analysis-content="true">
                  <div data-image-meal-error-context="true">
                    <span>Foto preservada enquanto esta tela estiver aberta</span>
                    <button data-image-meal-error-close="true">×</button>
                  </div>
                  <div data-image-meal-error-card="true" data-image-meal-error-tone="danger" role="alert">
                    <span data-image-meal-error-icon="true">!</span>
                    <p data-image-meal-error-eyebrow="true">Sem conexão</p>
                    <h2>Não foi possível acessar a internet</h2>
                    <p data-image-meal-error-message="true">Confira sua conexão e tente novamente usando esta mesma foto.</p>
                    <p data-image-meal-error-detail="true">A câmera permanece desligada.</p>
                    <div data-image-meal-error-actions="true">
                      <button data-image-meal-error-primary="true">Tentar novamente</button>
                      <button data-image-meal-error-secondary="true">Voltar à foto</button>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>`;
      }, theme);

      const card = page.locator('[data-image-meal-error-card="true"]');
      const primary = page.locator('[data-image-meal-error-primary="true"]');
      await card.evaluate(element => { element.scrollTop = element.scrollHeight; });
      await primary.scrollIntoViewIfNeeded();
      const metrics = await page.evaluate(() => {
        const analysis = document.querySelector('[data-image-meal-analysis="true"]');
        const photo = document.querySelector('[data-image-meal-analysis-photo="true"]');
        const card = document.querySelector('[data-image-meal-error-card="true"]');
        const primary = document.querySelector('[data-image-meal-error-primary="true"]');
        const secondary = document.querySelector('[data-image-meal-error-secondary="true"]');
        const close = document.querySelector('[data-image-meal-error-close="true"]');
        const cardRect = card.getBoundingClientRect();
        return {
          analysisPosition: getComputedStyle(analysis).position,
          photoFilter: getComputedStyle(photo).filter,
          cardBackground: getComputedStyle(card).backgroundColor,
          cardTop: cardRect.top,
          cardBottom: cardRect.bottom,
          cardOverflowY: getComputedStyle(card).overflowY,
          primaryHeight: primary.getBoundingClientRect().height,
          secondaryHeight: secondary.getBoundingClientRect().height,
          closeHeight: close.getBoundingClientRect().height,
          bodyOverflow: getComputedStyle(document.body).overflow,
          horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(metrics.analysisPosition).toBe('fixed');
      expect(metrics.photoFilter).toBe('none');
      expect(metrics.cardTop).toBeGreaterThanOrEqual(0);
      expect(metrics.cardBottom).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
      expect(metrics.cardOverflowY).toBe('auto');
      expect(metrics.primaryHeight).toBeGreaterThanOrEqual(48);
      expect(metrics.secondaryHeight).toBeGreaterThanOrEqual(48);
      expect(metrics.closeHeight).toBeGreaterThanOrEqual(48);
      expect(metrics.bodyOverflow).toBe('hidden');
      expect(metrics.horizontalOverflow).toBe(0);
      await expect(primary).toBeInViewport();
      await expect(page.locator('[data-image-meal-error-secondary="true"]')).toBeInViewport();
      if (theme === 'dark') expect(metrics.cardBackground).toBe('rgba(20, 29, 25, 0.92)');
      else expect(metrics.cardBackground).toBe('rgba(247, 251, 248, 0.94)');

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.locator('[data-image-meal-analysis="true"]')).toHaveCSS('animation-name', 'none');
    });
  }
});
