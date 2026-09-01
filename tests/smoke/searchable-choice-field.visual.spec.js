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

test.describe('authenticated SearchableChoiceField visual contract', () => {
  test.skip(!hasCredentials, missingCredentialsMessage);
  test.use({ storageState: AUTH_STATE_PATH });

  const fixture = {
    pantry_v2: JSON.stringify(Array.from({ length: 14 }, (_, index) => ({
      id: `visual-food-${index + 1}`,
      name: index === 9 ? 'Banana-prata' : `Alimento visual ${String(index + 1).padStart(2, '0')}`,
      unit: index % 3 === 0 ? 'un' : 'g',
      protein100: 4,
      kcal100: 120,
      protein: 4,
      kcal: 120,
    }))),
    mealTemplates: JSON.stringify([{
      id: 'visual-template',
      name: 'Refeição visual',
      meal: 'Almoço',
      items: [{
        foodId: 'visual-food-1', name: 'Alimento visual 01', qty: 100, unit: 'g',
        protein: 4, kcal: 120, carbs: 20, fat: 2,
      }],
    }]),
    suppPantry: JSON.stringify(Array.from({ length: 14 }, (_, index) => ({
      id: `visual-supplement-${index + 1}`,
      name: index === 7 ? 'Vitamina D3' : `Suplemento visual ${String(index + 1).padStart(2, '0')}`,
      dose: index + 1,
      unit: index % 2 ? 'mg' : 'g',
    }))),
  };

  async function installDynamicFixture(page) {
    await page.addInitScript(initialFixture => {
      let installedStorage;
      const fixtureState = { ...initialFixture };
      const fixtureKeys = new Set(Object.keys(fixtureState));

      function decorateStorage(storage) {
        if (!storage || storage.__searchableChoiceFixture) return storage;
        const originalGet = storage.get.bind(storage);
        const originalSet = storage.set.bind(storage);
        const originalList = typeof storage.list === 'function' ? storage.list.bind(storage) : null;
        const observe = async (operation, key, callback) => {
          const startedAt = performance.now();
          console.info(`[s9-diag] storage.${operation}:start:${key || ''}`);
          try {
            const result = await callback();
            console.info(`[s9-diag] storage.${operation}:ok:${key || ''}:${Math.round(performance.now() - startedAt)}ms`);
            return result;
          } catch (error) {
            console.info(`[s9-diag] storage.${operation}:error:${key || ''}:${error?.code || error?.message || String(error)}`);
            throw error;
          }
        };
        storage.get = key => observe('get', key, () => fixtureKeys.has(key)
          ? { value: fixtureState[key] }
          : originalGet(key));
        storage.set = async (key, value) => {
          if (fixtureKeys.has(key)) {
            fixtureState[key] = value;
            return true;
          }
          return observe('set', key, () => originalSet(key, value));
        };
        if (originalList) storage.list = prefix => observe('list', prefix, () => originalList(prefix));
        Object.defineProperty(storage, '__searchableChoiceFixture', { value: true });
        return storage;
      }

      Object.defineProperty(window, 'storage', {
        configurable: true,
        get: () => installedStorage,
        set: value => { installedStorage = decorateStorage(value); },
      });
    }, fixture);
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

  async function openSavedMealIngredient(page, pantryLabel = /Alimentos|Foods/i) {
    await clickByTutorialKeyOrText(page, 'tab-despensa', pantryLabel);
    const section = page.locator('[data-tutorial="pantry-meal-templates"]');
    await expect(section).toBeVisible();
    if (!await page.locator('#saved-meal-ingredient-visual-template-trigger').isVisible().catch(() => false)) {
      await section.getByRole('button').first().click();
      await section.getByRole('button', { name: /Editar|Edit/i }).click();
    }
    const trigger = page.locator('#saved-meal-ingredient-visual-template-trigger');
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.locator('[data-searchable-choice-field-sheet="true"]')).toBeVisible();
    return trigger;
  }

  async function openDiarySupplement(page, diaryLabel = /Di.rio|Diary/i, registerLabel = /Registrar suplemento|Log supplement/i) {
    await clickByTutorialKeyOrText(page, 'tab-diario', diaryLabel);
    const trigger = page.locator('#diary-supplement-trigger');
    if (!await trigger.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: registerLabel }).click();
    }
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.locator('[data-searchable-choice-field-sheet="true"]')).toBeVisible();
    return trigger;
  }

  async function readVisualStyles(page) {
    return page.evaluate(() => {
      const sheet = document.querySelector('[data-searchable-choice-field-sheet="true"]');
      const search = document.querySelector('[data-searchable-choice-field-search="true"]');
      const results = document.querySelector('[data-searchable-choice-field-results="true"]');
      const sheetStyle = getComputedStyle(sheet);
      const searchStyle = getComputedStyle(search);
      const resultsStyle = getComputedStyle(results);
      const thumbStyle = getComputedStyle(results, '::-webkit-scrollbar-thumb');
      const trackStyle = getComputedStyle(results, '::-webkit-scrollbar-track');
      return {
        sheetBackground: sheetStyle.backgroundColor,
        sheetRadius: sheetStyle.borderTopLeftRadius,
        sheetBackdrop: sheetStyle.backdropFilter || sheetStyle.webkitBackdropFilter,
        searchBackground: searchStyle.backgroundColor,
        searchRadius: searchStyle.borderRadius,
        scrollbarColor: resultsStyle.scrollbarColor,
        scrollbarWidth: resultsStyle.scrollbarWidth,
        thumbBackground: thumbStyle.backgroundColor,
        trackBackground: trackStyle.backgroundColor,
        resultsClientHeight: results.clientHeight,
        resultsScrollHeight: results.scrollHeight,
        searchTop: search.getBoundingClientRect().top,
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
  }

  test('filters long dynamic lists and themes the scrollbar in both app modes', async ({ page }) => {
    test.setTimeout(180000);
    await installDynamicFixture(page);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');
    const scrollbarByTheme = {};

    for (const theme of ['light', 'dark']) {
      await setTheme(page, theme);
      const ingredientTrigger = await openSavedMealIngredient(page);
      const sheet = page.locator('[data-searchable-choice-field-sheet="true"]');
      const results = sheet.locator('[data-searchable-choice-field-results="true"]');
      const search = sheet.getByRole('combobox');
      await expect(results.getByRole('option')).toHaveCount(14);
      await expect(page.locator('[data-tutorial="pantry-meal-templates"] select:visible')).toHaveCount(0);

      const ingredientStyles = await readVisualStyles(page);
      expect(ingredientStyles.sheetRadius).toBe('24px');
      expect(ingredientStyles.searchRadius).toBe('15px');
      expect(ingredientStyles.sheetBackdrop).not.toBe('none');
      expect(ingredientStyles.sheetBackground).not.toBe('rgba(0, 0, 0, 0)');
      expect(ingredientStyles.searchBackground).not.toBe('rgba(0, 0, 0, 0)');
      expect(ingredientStyles.resultsScrollHeight).toBeGreaterThan(ingredientStyles.resultsClientHeight);
      expect(ingredientStyles.scrollbarWidth).toBe('thin');
      expect(ingredientStyles.scrollbarColor).not.toBe('auto');
      expect(ingredientStyles.thumbBackground).not.toBe('rgba(0, 0, 0, 0)');
      expect(ingredientStyles.trackBackground).not.toBe('rgba(0, 0, 0, 0)');
      expect(ingredientStyles.scrollWidth).toBe(ingredientStyles.viewportWidth);
      scrollbarByTheme[theme] = {
        color: ingredientStyles.scrollbarColor,
        thumb: ingredientStyles.thumbBackground,
        track: ingredientStyles.trackBackground,
      };

      await results.evaluate(node => { node.scrollTop = node.scrollHeight; });
      const fixedSearchTop = await sheet.locator('[data-searchable-choice-field-search="true"]')
        .evaluate(node => node.getBoundingClientRect().top);
      expect(fixedSearchTop).toBeCloseTo(ingredientStyles.searchTop, 0);
      await search.fill('banana');
      await expect(sheet.locator('[data-searchable-choice-field-result-count="true"]')).toHaveText('1 resultado');
      await expect(results.getByRole('option')).toHaveCount(1);
      await results.getByRole('option', { name: /Banana-prata/ }).click();
      await expect(sheet).toHaveCount(0);
      await expect(ingredientTrigger).toContainText('Banana-prata');
      await ingredientTrigger.click();
      await expect(page.locator('[aria-selected="true"] [data-searchable-choice-field-selection] svg'))
        .toHaveAttribute('stroke-width', '1.45');
      await page.keyboard.press('Escape');

      const supplementTrigger = await openDiarySupplement(page);
      const supplementSheet = page.locator('[data-searchable-choice-field-sheet="true"]');
      await expect(supplementSheet.getByRole('option')).toHaveCount(14);
      await expect(page.locator('[data-screen="diario"] select:visible')).toHaveCount(0);
      await supplementSheet.getByRole('combobox').fill('vitamina');
      await expect(supplementSheet.getByRole('option')).toHaveCount(1);
      await supplementSheet.getByRole('option', { name: /Vitamina D3/ }).click();
      await expect(supplementSheet).toHaveCount(0);
      await expect(supplementTrigger).toContainText('Vitamina D3');
      await expect(supplementTrigger.locator('[data-searchable-choice-field-chevron] svg'))
        .toHaveAttribute('stroke-width', '1.35');
    }

    expect(scrollbarByTheme.light.color).not.toBe(scrollbarByTheme.dark.color);
    expect(scrollbarByTheme.light.thumb).not.toBe(scrollbarByTheme.dark.thumb);
    expect(scrollbarByTheme.light.track).not.toBe(scrollbarByTheme.dark.track);
    await expectNoCriticalErrors(errors);
  });

  test('uses PT, EN, and ES app-language copy and exposes an accessible empty state', async ({ page }) => {
    test.setTimeout(180000);
    const pendingFirestore = new Map();
    const firestoreEvents = [];
    page.on('console', message => {
      if (message.text().includes('[s9-diag]') || message.type() === 'error' || message.type() === 'warning') {
        console.log(`[browser:${message.type()}] ${message.text()}`);
      }
    });
    page.on('pageerror', error => console.log(`[pageerror] ${error.message}`));
    page.on('request', request => {
      if (!request.url().includes('firestore.googleapis.com')) return;
      pendingFirestore.set(request, {
        method: request.method(),
        path: new URL(request.url()).pathname.replace(/\/documents\/nutrition\/[^/?]+/g, '/documents/nutrition/[redacted]'),
      });
    });
    page.on('requestfinished', request => pendingFirestore.delete(request));
    page.on('requestfailed', request => {
      const pending = pendingFirestore.get(request);
      if (pending) firestoreEvents.push({ ...pending, outcome: `failed:${request.failure()?.errorText || 'unknown'}` });
      pendingFirestore.delete(request);
    });
    page.on('response', response => {
      if (!response.url().includes('firestore.googleapis.com')) return;
      const request = response.request();
      const pending = pendingFirestore.get(request);
      firestoreEvents.push({
        method: request.method(),
        path: pending?.path || new URL(response.url()).pathname,
        outcome: `http:${response.status()}`,
      });
    });
    await installDynamicFixture(page);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    const languages = [
      { code: 'pt', pantry: /Alimentos/i, diary: /Di.rio/i, ingredientSearch: 'Buscar ingrediente', supplementSearch: 'Buscar suplemento', empty: 'Nenhum suplemento encontrado' },
      { code: 'en', pantry: /Foods|Pantry/i, diary: /Diary/i, ingredientSearch: 'Search ingredient', supplementSearch: 'Search supplement', empty: 'No supplement found' },
      { code: 'es', pantry: /Alimentos/i, diary: /Diario/i, ingredientSearch: 'Buscar ingrediente', supplementSearch: 'Buscar suplemento', empty: 'No se encontró ningún suplemento' },
    ];

    for (const language of languages) {
      console.log(`[s9-diag] language:${language.code}:before`);
      try {
        await setAppLanguage(page, language.code);
      } catch (error) {
        const state = await page.evaluate(() => ({
          appLang: localStorage.getItem('appLang'),
          loadingCount: document.querySelectorAll('#loading').length,
          loadingText: document.querySelector('#loading')?.textContent?.trim() || '',
          loginVisible: Boolean(document.querySelector('input[type="email"]')),
          rootText: document.querySelector('#root')?.textContent?.trim().slice(0, 240) || '',
        })).catch(evaluationError => ({ evaluationError: evaluationError.message }));
        console.log(`[s9-diag] language:${language.code}:failure-state:${JSON.stringify(state)}`);
        console.log(`[s9-diag] firestore-events:${JSON.stringify(firestoreEvents)}`);
        console.log(`[s9-diag] pending-firestore:${JSON.stringify(Array.from(pendingFirestore.values()))}`);
        throw error;
      }
      console.log(`[s9-diag] language:${language.code}:ready`);
      await openSavedMealIngredient(page, language.pantry);
      await expect(page.getByRole('combobox')).toHaveAttribute('placeholder', language.ingredientSearch);
      await page.keyboard.press('Escape');

      await openDiarySupplement(page, language.diary);
      const search = page.getByRole('combobox');
      await expect(search).toHaveAttribute('placeholder', language.supplementSearch);
      await search.fill('resultado impossível');
      await expect(page.getByText(language.empty, { exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
    }

    await expectNoCriticalErrors(errors);
  });
});
