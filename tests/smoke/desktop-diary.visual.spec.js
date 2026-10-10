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

test.describe('D2 desktop Diary composition', () => {
  test.skip(!hasCredentials, missingCredentialsMessage);
  test.use({ storageState: AUTH_STATE_PATH });

  const CONTROLLED_MEAL_NAME = 'D2 controlled visual meal';
  const FILLED_DAY_OFFSET = -14;
  const EMPTY_DAY_OFFSET = -15;

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

  async function readLocalCivilDate(page, dayOffset = 0) {
    return page.evaluate(offset => {
      const today = window.DateUtils.localToday();
      return window.DateUtils.addCivilDays(today, offset);
    }, dayOffset);
  }

  async function replaceAndConfirmInNewContext(browser, baseURL, replacements) {
    const writer = await openIsolatedApp(browser, baseURL);
    let firstError = null;
    for (const replacement of replacements) {
      try {
        await replaceDailyLog(writer.page, replacement.date, replacement.log);
      } catch (error) {
        firstError ||= error;
      }
    }
    await expectNoCriticalErrors(writer.errors);
    await writer.context.close();
    if (firstError) throw firstError;

    const verifier = await openIsolatedApp(browser, baseURL);
    try {
      for (const replacement of replacements) {
        expect(await readDailyLog(verifier.page, replacement.date)).toEqual(replacement.log);
      }
      await expectNoCriticalErrors(verifier.errors);
    } finally {
      await verifier.context.close();
    }
  }

  async function setTheme(page, theme) {
    await page.evaluate(nextTheme => {
      localStorage.setItem('appThemeDefaultDarkV1', '1');
      localStorage.setItem('appDarkMode', String(nextTheme === 'dark'));
      localStorage.setItem('appThemePolicyVersion', '2');
      localStorage.setItem('appThemePreference', nextTheme);
    }, theme);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
    await dismissTutorialIfVisible(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  }

  async function navigateDirectlyToDate(page, targetDate) {
    const today = page.getByRole('button', { name: 'Hoje', exact: true });
    if (await today.count() && await today.isVisible()) {
      await expect(today).toBeEnabled();
      await today.evaluate(button => button.click());
      await expect(today).toBeHidden();
    }

    const diaryStack = page.locator('[data-diary-content-stack="true"]');
    const dateArea = diaryStack.locator('[data-diary-date-primary="true"]');
    const calendarToggle = dateArea.locator('button').nth(1);
    await expect(calendarToggle).toBeVisible();
    await expect(calendarToggle).toBeEnabled();
    const previousButtons = diaryStack.getByRole('button', { name: '‹', exact: true });
    if (await previousButtons.count() === 1) {
      await calendarToggle.evaluate(button => button.click());
      await expect(previousButtons).toHaveCount(2);
    }

    const [todayDate, targetYear, targetMonth, targetDay] = await page.evaluate(civilDate => {
      const localToday = window.DateUtils.localToday();
      const [year, month, day] = civilDate.split('-').map(Number);
      return [localToday, year, month, day];
    }, targetDate);
    const [todayYear, todayMonth] = todayDate.split('-').map(Number);
    const monthsBack = (todayYear - targetYear) * 12 + (todayMonth - targetMonth);
    expect(monthsBack).toBeGreaterThanOrEqual(0);

    const previousMonth = previousButtons.last();
    for (let step = 0; step < monthsBack; step += 1) {
      await expect(previousMonth).toBeVisible();
      await expect(previousMonth).toBeEnabled();
      await previousMonth.evaluate(button => button.click());
    }

    const targetDayButton = diaryStack.getByRole('button', { name: String(targetDay), exact: true });
    await expect(targetDayButton).toBeVisible();
    await expect(targetDayButton).toBeEnabled();
    await targetDayButton.evaluate(button => button.click());
    await expect(calendarToggle).toHaveText(
      targetDate.split('-').reverse().join('-')
    );
  }

  async function showControlledDiaryState(page, state, dates) {
    if (state === 'empty') {
      await navigateDirectlyToDate(page, dates.empty);
      await expect(page.locator('[data-diary-global-add="empty-day"]:visible')).toHaveCount(1);
      await expect(page.locator('[data-diary-meal-card="true"]:visible')).toHaveCount(0);
      return;
    }

    await navigateDirectlyToDate(page, dates.filled);
    const controlledMealCard = page.locator('[data-diary-meal-card="true"]:visible')
      .filter({ hasText: CONTROLLED_MEAL_NAME });
    await expect(controlledMealCard).toHaveCount(1);
    await expect(controlledMealCard.getByText(CONTROLLED_MEAL_NAME, { exact: true })).toBeVisible();
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

  test('uses the approved empty and filled layout at 1280, 1440, and 1920px in both themes', async ({ browser }, testInfo) => {
    test.setTimeout(420000);
    const baseURL = testInfo.project.use.baseURL;
    const snapshotReader = await openIsolatedApp(browser, baseURL);
    const filledDate = await readLocalCivilDate(snapshotReader.page, FILLED_DAY_OFFSET);
    const emptyDate = await readLocalCivilDate(snapshotReader.page, EMPTY_DAY_OFFSET);
    const controlledFilledLog = {
      Breakfast: [{
        id: 'd2-controlled-filled-entry',
        name: CONTROLLED_MEAL_NAME,
        qty: 100,
        unit: 'g',
        time: '08:30',
        kcal: 320,
        protein: 24,
        carbs: 36,
        fat: 9,
        fiber: 5,
        salt: 0.7,
      }],
    };
    const currentFilledLog = await readDailyLog(snapshotReader.page, filledDate);
    const snapshots = [
      {
        date: filledDate,
        log: JSON.stringify(currentFilledLog) === JSON.stringify(controlledFilledLog)
          ? {}
          : currentFilledLog,
      },
      { date: emptyDate, log: await readDailyLog(snapshotReader.page, emptyDate) },
    ];
    await expectNoCriticalErrors(snapshotReader.errors);
    await snapshotReader.context.close();

    let fixturePrepared = false;
    let visualContext = null;
    try {
      fixturePrepared = true;
      await replaceAndConfirmInNewContext(browser, baseURL, [
        { date: filledDate, log: controlledFilledLog },
        { date: emptyDate, log: {} },
      ]);

      visualContext = await openIsolatedApp(browser, baseURL);
      const { page, errors } = visualContext;
      await setAppLanguage(page, 'pt');

      for (const width of [1280, 1440, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const theme of ['light', 'dark']) {
          await setTheme(page, theme);
          for (const state of ['filled', 'empty']) {
            await showControlledDiaryState(page, state, {
              filled: filledDate,
              empty: emptyDate,
            });
            await expectDesktopGeometry(page, state);
          }
        }
      }

      await expectNoCriticalErrors(errors);
    } finally {
      await visualContext?.context.close();
      if (fixturePrepared) {
        await replaceAndConfirmInNewContext(browser, baseURL, snapshots);
      }
    }
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
