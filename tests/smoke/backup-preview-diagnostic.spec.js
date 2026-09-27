const fs = require('node:fs');
const { test, expect } = require('./app-check-fixture');
const {
  AUTH_STATE_PATH,
  hasCredentials,
  missingCredentialsMessage,
} = require('./test-credentials');
const {
  clickByTutorialKeyOrText,
  clickFirstButtonMatching,
  dismissTutorialIfVisible,
  interceptOptionalExternalApis,
  openApp,
  setAppLanguage,
} = require('./test-helpers');

test.describe('Vite backup preview diagnostics', () => {
  test.skip(!hasCredentials, missingCredentialsMessage);
  test.use({storageState: AUTH_STATE_PATH});

  test('reports preview settlement and Firestore reads without importing', async ({page}, testInfo) => {
    test.setTimeout(90000);
    await interceptOptionalExternalApis(page);
    await openApp(page);
    await setAppLanguage(page, 'pt');
    await dismissTutorialIfVisible(page);

    const diagnosticsAvailable = await page.evaluate(
      () => typeof window.debugFirestoreReadMetrics === 'function'
    );
    test.skip(!diagnosticsAvailable, 'requires the modular Vite Firestore runtime');

    await clickByTutorialKeyOrText(page, 'menu-settings', /Configura/i);
    await clickFirstButtonMatching(page, /Backup e restaurar/i);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', {name: /Exportar dados/i}).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    const backup = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
    const flat = {
      ...(backup.legacy || {}),
      ...(backup.root || {}),
      ...(backup.data || {}),
    };
    const dailyKeys = Object.keys(flat).filter(
      key => /^(log_v2|waterIntake|suppLog)_\d{4}-\d{2}-\d{2}$/.test(key)
    );
    const dailyDates = new Set(dailyKeys.map(key => key.slice(key.lastIndexOf('_') + 1)));

    await page.evaluate(() => window.debugFirestoreReadMetrics({reset: true}));
    const startedAt = Date.now();
    await page.locator('input[type="file"][accept=".json"]').last().setInputFiles(downloadPath);

    const heading = page.getByRole('heading', {name: /Revisar importação/i});
    const error = page.getByText(/Erro ao importar:/i);
    let outcome = 'pending';
    while (Date.now() - startedAt < 20000) {
      if (await heading.isVisible()) {
        outcome = 'visible';
        break;
      }
      if (await error.isVisible()) {
        outcome = 'error';
        break;
      }
      await page.waitForTimeout(250);
    }

    const evidence = {
      project: testInfo.project.name,
      outcome,
      elapsedMs: Date.now() - startedAt,
      importableKeys: Object.keys(flat).length,
      dailyKeys: dailyKeys.length,
      dailyDates: dailyDates.size,
      metrics: await page.evaluate(() => window.debugFirestoreReadMetrics()),
    };
    console.log(`BACKUP_PREVIEW_DIAGNOSTIC ${JSON.stringify(evidence)}`);

    expect(outcome, JSON.stringify(evidence)).toBe('visible');
    await expect(heading).toBeVisible();
  });
});
