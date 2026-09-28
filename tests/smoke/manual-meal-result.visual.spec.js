const { test, expect } = require('@playwright/test');

function fixture(theme) {
  return `
    <div data-one-ui-root data-theme="${theme}">
      <main data-app-main="adicionar" style="position:fixed;inset:0;overflow:hidden">
        <section data-manual-search="true" style="padding:24px;display:grid;gap:12px">
          <h1>Adicionar alimento</h1>
          <input aria-label="Buscar alimento" value="arroz">
          <button data-manual-food-result="true">Arroz branco, cozido · 100 g padrão · 130 kcal</button>
          <button data-manual-food-result="true">Arroz integral, cozido · 100 g padrão · 124 kcal</button>
        </section>
        <div data-meal-result-overlay="true" data-meal-result-source="saved-food" data-meal-result-snap="compact" role="dialog" aria-modal="true">
          <div data-meal-result-scrim="true"></div>
          <section data-meal-result-sheet="true">
            <button data-meal-result-handle="true" aria-expanded="false" aria-label="Expandir detalhes"><span></span></button>
            <div data-meal-result-scroll="true">
              <header data-meal-result-header="true">
                <div data-meal-result-thumbnail="true">✓</div>
                <div><h2>Arroz branco, cozido</h2>
                  <div data-meal-result-confidence-row="true"><span data-meal-result-confidence-badge="true">Alimento verificado</span><span>Alimentos salvos</span></div>
                </div>
              </header>
              <div data-meal-result-portion="true"><span>Porção</span><div><button>−</button><button data-numeric-field-trigger="true">250 g</button><button>+</button></div></div>
              <div data-meal-result-metrics="true">
                <div data-meal-result-metric="kcal" data-meal-result-highlight="true"><strong>325</strong><span>kcal</span></div>
                <div data-meal-result-metric="carbs"><strong>70</strong><span>Carboidratos g</span></div>
                <div data-meal-result-metric="protein"><strong>6</strong><span>Proteína g</span></div>
                <div data-meal-result-metric="fat"><strong>1</strong><span>Gordura g</span></div>
              </div>
              <details data-meal-result-secondary="true"><summary>Fibra 1 g · Açúcares 0 g · Sal 0 g</summary></details>
              <div data-meal-result-ingredients-heading="true"><strong>Ingredientes</strong></div>
              <div data-meal-result-ingredients="true">
                <article data-meal-result-item="true" data-meal-result-item-id="saved-rice">
                  <span data-meal-result-item-dot="true"></span>
                  <span data-meal-result-item-name="true">Arroz branco, cozido</span>
                  <button data-numeric-field-trigger="true">250 g</button>
                  <span data-meal-result-item-kcal="true">325 kcal</span>
                  <button aria-label="Remover arroz branco">×</button>
                </article>
              </div>
              <div data-meal-result-secondary-actions="true"><button>Avaliar refeição</button><button>Voltar à busca</button></div>
            </div>
            <footer data-meal-result-footer="true">
              <div data-choice-field="true"><span data-choice-field-label="true">Refeição</span><button data-choice-field-trigger="true">Almoço</button></div>
              <button data-meal-result-confirm="true">Registrar refeição</button>
            </footer>
          </section>
        </div>
      </main>
    </div>`;
}

test.describe('CAM-RED-8 shared manual meal result', () => {
  for (const theme of ['light', 'dark']) {
    test(`${theme} reuses the approved compact sheet over the saved-food search`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('index.html', { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ themeName, markup }) => {
        document.documentElement.dataset.theme = themeName;
        document.body.innerHTML = markup;
      }, { themeName: theme, markup: fixture(theme) });

      const overlay = page.locator('[data-meal-result-overlay="true"]');
      const sheet = page.locator('[data-meal-result-sheet="true"]');
      const box = await sheet.boundingBox();
      expect(box.y / 844).toBeGreaterThanOrEqual(0.30);
      expect(box.height / 844).toBeGreaterThanOrEqual(0.65);
      await expect(overlay).toHaveAttribute('data-meal-result-source', 'saved-food');
      await expect(page.getByText('Alimento verificado')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Voltar à busca' })).toBeVisible();
      await expect(page.locator('[data-meal-result-confirm="true"]')).toBeInViewport();
      await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
      await page.screenshot({ path: testInfo.outputPath(`cam-red-8-manual-${theme}.png`), fullPage: false });
    });
  }
});
