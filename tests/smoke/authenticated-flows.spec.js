const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const {
  AUTH_STATE_PATH,
  hasCredentials,
  missingCredentialsMessage
} = require('./test-credentials');
const {
  clickByTutorialKeyOrText,
  clickFirstButtonMatching,
  dismissTutorialIfVisible,
  expectNoCriticalErrors,
  interceptOptionalExternalApis,
  openApp,
  setAppLanguage
} = require('./test-helpers');

test.describe('authenticated critical data flows', () => {
  test.skip(!hasCredentials, missingCredentialsMessage);
  test.use({ storageState: AUTH_STATE_PATH });

  async function readStorage(page, key) {
    return page.evaluate(async (storageKey) => {
      const result = await window.storage.get(storageKey).catch(() => null);
      return result && result.value !== undefined ? { exists: true, value: result.value } : { exists: false, value: null };
    }, key);
  }

  async function writeStorage(page, key, value) {
    await page.evaluate(([storageKey, storageValue]) => window.storage.set(storageKey, storageValue), [key, value]);
  }

  async function replaceStorage(page, key, value) {
    // Let the app's hydration save finish before replacing shared Firestore data.
    // Otherwise that delayed save can restore the previous value after this write.
    await page.waitForTimeout(1000);
    await writeStorage(page, key, value);
    await expect.poll(async () => {
      const current = await readStorage(page, key);
      return current.exists ? current.value : null;
    }, { timeout: 30000 }).toBe(value);
  }

  async function restoreStorage(page, key, snapshot) {
    if (page.isClosed()) return;
    await page.waitForTimeout(900);
    if (page.isClosed()) return;
    await page.evaluate(async ([storageKey, previous]) => {
      if (previous.exists) await window.storage.set(storageKey, previous.value);
      else await window.storage.delete(storageKey);
    }, [key, snapshot]);
  }

  async function replacePantry(page, foods) {
    const previous = await readStorage(page, 'pantry_v2');
    await replaceStorage(page, 'pantry_v2', JSON.stringify(foods));
    await page.evaluate(async () => {
      const tutorialTypes = ['main', 'diario', 'adicionar', 'despensa', 'semana', 'metricas'];
      await Promise.all(tutorialTypes.map(type => window.storage.set(`tutorialSeen_${type}`, 'true')));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
    await dismissTutorialIfVisible(page);
    return previous;
  }

  async function addPantryFoodToStagedMeal(page, foodName, quantity) {
    const stagedMeal = page.locator('[data-app-main="adicionar"]:visible');
    const foodSearch = stagedMeal.locator([
      'input[placeholder*="Pesquisar alimento"]:visible',
      'input[placeholder*="Search food"]:visible',
      'input[placeholder*="Buscar alimento"]:visible'
    ].join(', '));
    await foodSearch.fill(foodName);
    await stagedMeal.getByText(foodName, { exact: true }).last().click();
    await stagedMeal.locator('input[type="number"]:visible').last().fill(String(quantity));
    await stagedMeal.getByRole('button', { name: /Adicionar à refeição|Add to meal|Agregar a la comida/i }).click();
  }

  async function openStagedMeal(page) {
    const globalAddButton = page.locator(
      '[data-diary-global-add]:visible [data-tutorial="open-log-sheet"]'
    ).first();
    await expect(globalAddButton).toBeVisible();
    await globalAddButton.click();
    await expect(page.locator('[data-app-main="adicionar"]:visible')).toBeVisible();
  }

  test('opens the dedicated image-recognition flow from the real Add navigation', async ({ page }) => {
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    const usesFrozenLegacyLoader = await page.locator('script[src*="app.js"]').count() > 0;
    test.skip(usesFrozenLegacyLoader, 'C24 is composed only by the production Vite runtime');
    await setAppLanguage(page, 'pt');
    await openStagedMeal(page);

    const addModal = page.locator('[data-app-main="adicionar"]:visible');
    await addModal.locator('[data-add-mode="image"]').click();

    const imageScreen = addModal.locator('[data-image-meal-screen="true"]');
    await expect(imageScreen).toBeVisible();
    await expect(imageScreen.getByRole('heading', { name: /Reconhecer refeição por foto/i })).toBeVisible();
    await expect(imageScreen.getByRole('button', { name: 'Tirar foto', exact: true })).toBeVisible();
    await expect(imageScreen.getByRole('button', { name: 'Escolher da galeria', exact: true })).toBeVisible();
    await expect(addModal.locator('#image-meal-category')).toBeVisible();
    await expectNoCriticalErrors(errors);
  });

  test('exports, previews, imports, and verifies a real backup round trip', async ({ page }) => {
    test.setTimeout(90000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');

    // Keep the backup fixture away from the actively hydrated civil day.
    // The app autosaves today's note, which can otherwise race this direct
    // Firestore setup on slower authenticated runners.
    const noteKey = 'notes_2000-01-01';
    const previousNote = await readStorage(page, noteKey);
    const originalMarker = `backup-e2e-${Date.now()}`;
    const changedMarker = `${originalMarker}-changed`;

    try {
      await replaceStorage(page, noteKey, originalMarker);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await dismissTutorialIfVisible(page);
      await clickByTutorialKeyOrText(page, 'menu-settings', /Configura/i);
      await clickFirstButtonMatching(page, /Backup e restaurar/i);

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: /Exportar dados/i }).click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      const backup = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
      expect(JSON.stringify(backup)).toContain(originalMarker);

      await replaceStorage(page, noteKey, changedMarker);
      await page.locator('input[type="file"][accept=".json"]').last().setInputFiles(downloadPath);
      await expect(page.getByRole('heading', { name: /Revisar importação/i })).toBeVisible({ timeout: 20000 });

      await page.getByRole('checkbox', { name: /^Notas\b/i }).check({ force: true });
      await page.getByRole('button', { name: 'Substituir', exact: true }).click();
      await page.getByRole('button', { name: /Importar selecionados/i }).click();
      await expect(page.getByText(/Importação concluída:/i)).toBeVisible({ timeout: 30000 });

      await expect.poll(async () => (await readStorage(page, noteKey)).value).toBe(originalMarker);
      await expectNoCriticalErrors(errors);
    } finally {
      await restoreStorage(page, noteKey, previousNote);
    }
  });

  test('adds a meal to a past date and opens it from Week history', async ({ page }) => {
    test.setTimeout(60000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');

    const fixture = {
      id: `retro-food-${Date.now()}`,
      name: `Refeição retroativa ${Date.now()}`,
      unit: 'g',
      protein100: 18,
      kcal100: 220,
      carbs100: 20,
      fat100: 8,
      fiber100: 3,
      salt100: 0.4
    };
    const yesterday = await page.evaluate(() => {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return date.toISOString().split('T')[0];
    });
    const logKey = `log_v2_${yesterday}`;
    const previousLog = await readStorage(page, logKey);
    await replaceStorage(page, logKey, JSON.stringify({}));
    const previousPantry = await replacePantry(page, [fixture]);

    try {
      const diary = page.locator('[data-screen="diario"]');
      await diary.getByRole('button', { name: '‹', exact: true }).evaluate(button => button.click());
      await expect(page.getByRole('button', { name: 'Hoje', exact: true })).toBeVisible();
      await openStagedMeal(page);
      await addPantryFoodToStagedMeal(page, fixture.name, 100);
      const stagedMeal = page.locator('[data-app-main="adicionar"]:visible');
      await stagedMeal.getByRole('button', { name: 'Registrar', exact: true }).click();
      await expect.poll(async () => {
        const current = await readStorage(page, logKey);
        return current.value || '';
      }, { timeout: 30000 }).toContain(fixture.name);
      await expect(stagedMeal).toBeHidden();
      await dismissTutorialIfVisible(page);
      await expect(page.getByText(fixture.name, { exact: true })).toBeVisible();
      await clickByTutorialKeyOrText(page, 'tab-semana', /Semana/i);

      const yesterdayLabel = yesterday.slice(5).split('-').reverse().join('-');
      const yesterdayCard = page.locator('[data-tutorial="week-days"] > div').filter({ hasText: yesterdayLabel }).first();
      await expect(yesterdayCard).toBeVisible({ timeout: 15000 });
      await yesterdayCard.click();
      await expect(page.getByText(fixture.name, { exact: true })).toBeVisible();
      await expectNoCriticalErrors(errors);
    } finally {
      await restoreStorage(page, logKey, previousLog);
      await restoreStorage(page, 'pantry_v2', previousPantry);
    }
  });

  test('edits, re-evaluates, and logs a locally scored meal while AI times out', async ({ page }) => {
    test.setTimeout(60000);
    await interceptOptionalExternalApis(page, { aiDelayMs: 300 });
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');

    const today = await page.evaluate(() => new Date().toISOString().split('T')[0]);
    const logKey = `log_v2_${today}`;
    const previousLog = await readStorage(page, logKey);
    const fixture = {
      id: `review-food-${Date.now()}`,
      name: `Avaliação local ${Date.now()}`,
      unit: 'g',
      protein100: 25,
      kcal100: 180,
      carbs100: 12,
      fat100: 5,
      fiber100: 4,
      salt100: 0.3
    };
    await replaceStorage(page, logKey, JSON.stringify({}));
    const previousPantry = await replacePantry(page, [fixture]);

    try {
      await openStagedMeal(page);
      await addPantryFoodToStagedMeal(page, fixture.name, 100);
      const stagedMeal = page.locator('[data-app-main="adicionar"]:visible');
      await stagedMeal.getByRole('button', { name: /Avaliar refeição/i }).click();

      const modal = page.locator('[data-meal-review-modal="true"]');
      await expect(modal).toBeVisible();
      const firstScore = await modal.getByText(/^\d\.\d{2}$/).first().textContent();
      await modal.getByRole('button', { name: 'Editar', exact: true }).click();

      const stagedItem = stagedMeal.locator('[data-tutorial="pantry-food-name"]').filter({ hasText: fixture.name });
      await stagedItem.getByText('100g', { exact: true }).click();
      await stagedItem.locator('input[type="number"]').fill('200');
      await stagedItem.getByRole('button', { name: '✓', exact: true }).click();
      await stagedMeal.getByRole('button', { name: /Avaliar refeição/i }).click();

      await expect(modal).toBeVisible();
      const secondScore = await modal.getByText(/^\d\.\d{2}$/).first().textContent();
      expect(secondScore).not.toBe(firstScore);
      await modal.getByRole('button', { name: /Registrar mesmo assim/i }).click();
      await expect(stagedMeal).toBeHidden();
      await dismissTutorialIfVisible(page);
      await expect(page.getByText(fixture.name, { exact: true })).toBeVisible();
      await expect.poll(async () => {
        const current = await readStorage(page, logKey);
        return current.value || '';
      }, { timeout: 30000 }).toContain(fixture.name);
      const storedLog = JSON.parse((await readStorage(page, logKey)).value || '{}');
      const storedEntry = Object.values(storedLog).flat().find(item => item.name === fixture.name);
      expect(storedEntry.qty).toBe(200);
      expect(storedEntry.mealScoreSnapshot.score).toBeGreaterThanOrEqual(0);
      expect(storedEntry.mealScoreSnapshot.score).toBeLessThanOrEqual(5);
      const unexpectedErrors = errors.filter(error => !/Failed to load resource: net::ERR_TIMED_OUT/i.test(error));
      await expectNoCriticalErrors(unexpectedErrors);
    } finally {
      await restoreStorage(page, logKey, previousLog);
      await restoreStorage(page, 'pantry_v2', previousPantry);
    }
  });

  test('adds a GA suggestion and preserves the suggested nutrient math', async ({ page }) => {
    test.setTimeout(90000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');

    const today = await page.evaluate(() => new Date().toISOString().split('T')[0]);
    const logKey = `log_v2_${today}`;
    const previousLog = await readStorage(page, logKey);
    const fixture = {
      id: `ga-food-${Date.now()}`,
      name: `Alimento GA ${Date.now()}`,
      unit: 'g',
      protein100: 10,
      kcal100: 100,
      carbs100: 20,
      fat100: 2,
      fiber100: 2,
      salt100: 0.1
    };
    await replaceStorage(page, logKey, JSON.stringify({}));
    const previousPantry = await replacePantry(page, [fixture]);

    try {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await dismissTutorialIfVisible(page);
      await page.locator('[data-tutorial="suggest-meal-button"]').click();
      await page.getByRole('button', { name: /Ajustes avançados opcionais/i }).click();
      await page.getByRole('spinbutton', { name: /Calorias máximas/i }).fill('1000');
      await page.getByRole('spinbutton', { name: /Proteína máxima/i }).fill('100');
      await page.getByRole('button', { name: /Buscar sugestões/i }).click();

      const addButton = page.getByRole('button', { name: /Adicionar ao diário/i }).first();
      await expect(addButton).toBeVisible({ timeout: 45000 });
      const resultCard = addButton.locator('..');
      const resultText = await resultCard.textContent();
      const quantityMatch = resultText.match(new RegExp(`${fixture.name}:\\s*(\\d+)g`));
      expect(quantityMatch).not.toBeNull();
      const suggestedQuantity = Number(quantityMatch[1]);
      await addButton.click();

      const entry = await expect.poll(async () => {
        const current = await readStorage(page, logKey);
        if (!current.value) return null;
        const parsed = JSON.parse(current.value);
        return Object.values(parsed).flat().find(item => item.name === fixture.name) || null;
      }, { timeout: 30000 }).not.toBeNull();
      void entry;

      const savedEntry = await page.evaluate(async ([key, name]) => {
        const current = await window.storage.get(key);
        const parsed = JSON.parse(current.value || '{}');
        return Object.values(parsed).flat().find(item => item.name === name);
      }, [logKey, fixture.name]);
      expect(savedEntry.qty).toBe(suggestedQuantity);
      expect(savedEntry.protein).toBeCloseTo(fixture.protein100 * suggestedQuantity / 100, 6);
      expect(savedEntry.kcal).toBeCloseTo(fixture.kcal100 * suggestedQuantity / 100, 6);
      await expectNoCriticalErrors(errors);
    } finally {
      await restoreStorage(page, logKey, previousLog);
      await restoreStorage(page, 'pantry_v2', previousPantry);
    }
  });
});
