const {
  test,
  expect,
  installCiAppCheckForContext,
} = require('./app-check-fixture');
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

test.describe('I4-B Add sheet orchestration', () => {
  test.skip(!hasCredentials, missingCredentialsMessage);
  test.use({ storageState: AUTH_STATE_PATH });

  async function openIsolatedApp(browser, baseURL) {
    const context = await browser.newContext({
      baseURL,
      storageState: AUTH_STATE_PATH,
    });
    await installCiAppCheckForContext(context);
    const page = await context.newPage();
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await dismissTutorialIfVisible(page);
    return { context, errors, page };
  }

  async function openManualAdd(page) {
    await dismissTutorialIfVisible(page);
    const addButton = page.locator('[data-tutorial="open-log-sheet"]:visible').first();
    await expect(addButton).toBeVisible();
    await addButton.evaluate(button => button.click());
    const createMenu = page.locator('[data-diary-create-menu]:visible');
    await expect(createMenu).toBeVisible();
    await createMenu.locator('[data-create-menu-option="manual"]').click();
    const sheet = page.locator('[data-app-main="adicionar"]:visible');
    await expect(sheet).toBeVisible();
    return sheet;
  }

  async function readDailyLog(page, date) {
    return page.evaluate(async civilDate => {
      if (typeof window.storage.readDailyStateCompatible === 'function') {
        const state = await window.storage.readDailyStateCompatible(civilDate);
        return state?.log || {};
      }
      const result = await window.storage.get(`log_v2_${civilDate}`).catch(() => null);
      return JSON.parse(result?.value || '{}');
    }, date);
  }

  async function replaceDailyLog(page, date, log) {
    await page.evaluate(async ([civilDate, value]) => {
      if (typeof window.storage.replaceDailyAggregate === 'function') {
        await window.storage.replaceDailyAggregate('meal', civilDate, JSON.stringify(value));
        return;
      }
      await window.storage.set(`log_v2_${civilDate}`, JSON.stringify(value));
    }, [date, log]);
  }

  async function replaceAndConfirmInNewContext(browser, baseURL, date, log) {
    const writer = await openIsolatedApp(browser, baseURL);
    try {
      await replaceDailyLog(writer.page, date, log);
      await expectNoCriticalErrors(writer.errors);
    } finally {
      await writer.context.close();
    }

    const verifier = await openIsolatedApp(browser, baseURL);
    try {
      expect(await readDailyLog(verifier.page, date)).toEqual(log);
      await expectNoCriticalErrors(verifier.errors);
    } finally {
      await verifier.context.close();
    }
  }

  test('keeps destination, time, repeat and manual entry in the approved sheet hierarchy', async ({ page }) => {
    test.setTimeout(90000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);

    for (const [language, copy] of [
      ['pt', ['Adicionar alimento', 'Para', 'Agora', 'Entrada manual']],
      ['en', ['Add food', 'To', 'Now', 'Manual entry']],
      ['es', ['Añadir alimento', 'Para', 'Ahora', 'Entrada manual']],
    ]) {
      await setAppLanguage(page, language);
      const sheet = await openManualAdd(page);
      const header = sheet.locator('[data-add-orchestration-header]');
      await expect(header).toBeVisible();
      await expect(header).toContainText(copy[0]);
      await expect(header.locator('[data-add-destination-prefix]')).toHaveText(copy[1]);
      await expect(header.locator('[data-add-time-chip]')).toContainText(copy[2]);
      await expect(sheet.locator('[data-add-repeat-recent]')).toBeVisible();
      await expect(sheet.locator('[data-add-manual-entry]')).toContainText(copy[3]);

      await header.locator('[data-add-time-chip]').click();
      await expect(header.locator('[data-meal-time-control="open"]')).toBeVisible();
      await expect(page.locator('input[type="time"]')).toHaveCount(0);
      await sheet.locator('[data-add-close]').click();
      await expect(sheet).toHaveCount(0);
      await expect(page.locator('[data-app-main="diario"]:visible')).toBeVisible();
    }

    await expectNoCriticalErrors(errors);
  });

  test('uses a bottom sheet on mobile and a bounded surface on desktop', async ({ page }) => {
    test.setTimeout(60000);
    await interceptOptionalExternalApis(page);
    const errors = await openApp(page);
    await setAppLanguage(page, 'pt');

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1280, height: 850 },
    ]) {
      await page.setViewportSize(viewport);
      const sheet = await openManualAdd(page);
      await sheet.evaluate(node => Promise.all(
        node.getAnimations().map(animation => animation.finished.catch(() => undefined))
      ));
      const layout = await sheet.evaluate(node => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          bottom: Math.round(rect.bottom),
          height: Math.round(rect.height),
          radius: style.borderTopLeftRadius,
          scrollWidth: document.documentElement.scrollWidth,
          viewportHeight: document.documentElement.clientHeight,
          viewportWidth: document.documentElement.clientWidth,
        };
      });
      expect(layout.radius).toBe('28px');
      expect(layout.scrollWidth).toBe(layout.viewportWidth);
      if (viewport.width <= 720) {
        expect(Math.abs(layout.viewportHeight - layout.bottom)).toBeLessThanOrEqual(1);
        expect(layout.height).toBeLessThanOrEqual(Math.ceil(layout.viewportHeight * 0.92));
      }
      await sheet.locator('[data-add-close]').click();
    }

    await expectNoCriticalErrors(errors);
  });

  test('repeats a recent meal in one tap and undoes only the new entries', async ({ browser }, testInfo) => {
    test.setTimeout(90000);
    const baseURL = testInfo.project.use.baseURL;
    const snapshotReader = await openIsolatedApp(browser, baseURL);
    const today = await snapshotReader.page.evaluate(() => window.DateUtils.localToday());
    const previousToday = await readDailyLog(snapshotReader.page, today);
    await expectNoCriticalErrors(snapshotReader.errors);
    await snapshotReader.context.close();
    const marker = `Repetição I4-B ${Date.now()}`;
    const entry = {
      id: `i4b-source-${Date.now()}`,
      name: marker,
      qty: 100,
      unit: 'g',
      protein: 12,
      kcal: 120,
      carbs: 18,
      fat: 3,
      fiber: 2,
      salt: 0.2,
      time: '08:00',
    };

    let fixturePrepared = false;
    let visualContext = null;
    try {
      fixturePrepared = true;
      await replaceAndConfirmInNewContext(
        browser,
        baseURL,
        today,
        {'Café da manhã': [entry]}
      );

      visualContext = await openIsolatedApp(browser, baseURL);
      const {page, errors} = visualContext;
      await setAppLanguage(page, 'pt');

      const sheet = await openManualAdd(page);
      const repeatCard = sheet.locator('[data-add-repeat-card]').filter({hasText: marker});
      await expect(repeatCard).toBeVisible();
      await repeatCard.click();
      await expect(sheet).toBeHidden();
      await expect.poll(async () => {
        const current = await readDailyLog(page, today);
        return Object.values(current).flat().filter(item => item.name === marker).length;
      }, {
        timeout: 30000,
      }).toBe(2);

      const notification = page.locator('[data-app-notification="action"]');
      await expect(notification).toContainText('Refeição repetida no Diário.');
      await notification.locator('[data-notification-action]').click();
      await expect.poll(async () => {
        const current = await readDailyLog(page, today);
        return Object.values(current).flat()
          .filter(item => item.name === marker)
          .map(item => item.id);
      }, {
        timeout: 30000,
      }).toEqual([entry.id]);
      await expect(page.locator('[data-app-notification]')).toContainText('Repetição desfeita.');
      await expectNoCriticalErrors(errors);
    } finally {
      await visualContext?.context.close();
      if (fixturePrepared) {
        await replaceAndConfirmInNewContext(browser, baseURL, today, previousToday);
      }
    }
  });
});
