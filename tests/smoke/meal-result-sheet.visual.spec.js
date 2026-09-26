const { test, expect } = require('@playwright/test');

function fixture(theme) {
  const ingredients = Array.from({ length: 10 }, (_, index) => `
    <article data-meal-result-item="true" data-meal-result-item-id="item-${index}">
      <span data-meal-result-item-dot="true"></span>
      <span data-meal-result-item-name="true">Ingrediente ${index + 1} com nome deliberadamente longo para validar a quebra</span>
      <button data-numeric-field-trigger="true">${80 + index * 10} g</button>
      <span data-meal-result-item-kcal="true">${100 + index * 12} kcal</span>
      <button aria-label="Remover ingrediente ${index + 1}">×</button>
    </article>`).join('');
  return `
    <div data-one-ui-root data-theme="${theme}">
      <main data-app-main="adicionar" style="height:180vh">Conteúdo bloqueado</main>
      <div data-meal-result-overlay="true" data-meal-result-snap="compact" role="dialog" aria-modal="true">
        <img data-meal-result-photo="true" alt="Foto analisada" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='800'%3E%3Crect width='400' height='800' fill='%23547149'/%3E%3C/svg%3E">
        <div data-meal-result-scrim="true"></div>
        <section data-meal-result-sheet="true">
          <button data-meal-result-handle="true" aria-expanded="false" aria-label="Expandir detalhes"><span></span></button>
          <div data-meal-result-scroll="true">
            <header data-meal-result-header="true">
              <div data-meal-result-thumbnail="true"></div>
              <div><h2>Frango grelhado com arroz, feijão e um nome muito comprido que precisa quebrar corretamente</h2>
                <div data-meal-result-confidence-row="true"><span data-meal-result-confidence-badge="true">Confiança média</span><span>Estimativa por foto</span></div>
              </div>
            </header>
            <div data-meal-result-portion="true"><span>Porção</span><div><button>−</button><button data-numeric-field-trigger="true">380 g</button><button>+</button></div></div>
            <div data-meal-result-metrics="true">
              <div data-meal-result-metric="kcal" data-meal-result-highlight="true"><strong>538</strong><span>kcal</span></div>
              <div data-meal-result-metric="carbs"><strong>71</strong><span>Carboidratos g</span></div>
              <div data-meal-result-metric="protein"><strong>52</strong><span>Proteína g</span></div>
              <div data-meal-result-metric="fat"><strong>14</strong><span>Gordura g</span></div>
            </div>
            <details data-meal-result-secondary="true"><summary>Fibra 9 g · Açúcares 3 g · Sal 2 g</summary></details>
            <div data-meal-result-ingredients-heading="true"><strong>Ingredientes</strong><button>+ Adicionar</button></div>
            <div data-meal-result-ingredients="true">${ingredients}</div>
          </div>
          <footer data-meal-result-footer="true">
            <div data-choice-field="true"><span data-choice-field-label="true">Refeição</span><button data-choice-field-trigger="true">Almoço</button></div>
            <button data-meal-result-confirm="true">Registrar refeição</button>
          </footer>
        </section>
      </div>
    </div>`;
}

test.describe('CAM-RED-7 progressive meal result sheet', () => {
  for (const theme of ['light', 'dark']) {
    test(`${theme} preserves the approved compact and expanded geometry`, async ({ page }, testInfo) => {
      await page.goto('index.html', { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ themeName, markup }) => {
        document.documentElement.dataset.theme = themeName;
        document.body.innerHTML = markup;
      }, { themeName: theme, markup: fixture(theme) });

      const overlay = page.locator('[data-meal-result-overlay="true"]');
      const sheet = page.locator('[data-meal-result-sheet="true"]');
      const photo = page.locator('[data-meal-result-photo="true"]');
      const footer = page.locator('[data-meal-result-footer="true"]');
      const compact = await sheet.boundingBox();
      const viewport = page.viewportSize();
      expect(compact.y / viewport.height).toBeGreaterThanOrEqual(0.30);
      expect(compact.y / viewport.height).toBeLessThanOrEqual(0.34);
      expect(compact.height / viewport.height).toBeGreaterThanOrEqual(0.65);
      expect(compact.height / viewport.height).toBeLessThanOrEqual(0.70);
      await expect(photo).toBeVisible();
      await expect(footer).toBeInViewport();
      await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
      await expect(page.locator('[data-meal-result-confirm="true"]')).toHaveCSS('min-height', '56px');
      await expect(page.locator('[data-meal-result-item-id="item-0"] > button').last()).toHaveCSS('height', '48px');

      await overlay.evaluate(element => { element.dataset.mealResultSnap = 'expanded'; });
      await expect(sheet).toHaveCSS('top', '0px');
      const expanded = await sheet.boundingBox();
      expect(expanded.y).toBeLessThanOrEqual(1);
      await expect(footer).toBeInViewport();
      const scroll = page.locator('[data-meal-result-scroll="true"]');
      await scroll.evaluate(element => { element.scrollTop = element.scrollHeight; });
      expect(await scroll.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
      await expect(page.locator('[data-meal-result-item-id="item-9"]')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

      await page.screenshot({ path: testInfo.outputPath(`cam-red-7-${theme}-expanded.png`), fullPage: false });
    });
  }

  test('remains usable at 200% text and removes motion when requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(markup => {
      document.documentElement.style.fontSize = '32px';
      document.body.innerHTML = markup;
    }, fixture('light'));

    await expect(page.locator('[data-meal-result-sheet="true"]')).toHaveCSS('transition-duration', '0s');
    await expect(page.locator('[data-meal-result-footer="true"]')).toBeInViewport();
    await expect(page.locator('[data-meal-result-confirm="true"]')).toBeVisible();
    const heading = page.locator('[data-meal-result-header="true"] h2');
    expect((await heading.boundingBox()).height).toBeGreaterThan(40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize().width);
  });
});
