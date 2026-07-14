const { test, expect } = require('@playwright/test');

const TEST_EMAIL = process.env.NUTRITION_TEST_EMAIL || '';
const TEST_PASSWORD = process.env.NUTRITION_TEST_PASSWORD || '';
const HAS_AUTH_CREDENTIALS = Boolean(TEST_EMAIL && TEST_PASSWORD);

/**
 * Captures runtime errors that usually mean the app failed to boot.
 *
 * The console filter deliberately ignores only browser/resource noise that does
 * not include useful app context. Thrown page errors still fail immediately, so
 * syntax errors, missing globals, and broken render paths stay visible.
 */
function collectCriticalErrors(page) {
  const errors = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;

    const text = message.text();
    if (isIgnorableConsoleError(text)) return;

    errors.push(text);
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  return errors;
}

function isIgnorableConsoleError(text) {
  return /favicon/i.test(text)
    || /Failed to load resource: the server responded with a status of 404 \(\)/i.test(text);
}

async function openApp(page) {
  const errors = collectCriticalErrors(page);

  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#root')).toBeVisible();
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 10000 });

  return errors;
}

async function expectNoCriticalErrors(errors) {
  expect(errors, `critical browser errors:\n${errors.join('\n')}`).toEqual([]);
}

async function login(page) {
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /Entrar|Sign in/i }).last().click();

  await expect(
    page.locator('button').filter({
      hasText: /Di.rio|Diary|Alimentos|Foods|Semana|Week|M.tricas|Metrics/i
    }).first()
  ).toBeVisible({ timeout: 20000 });

  await dismissTutorialIfVisible(page);
}

/**
 * Clears onboarding overlays that may appear after login or when opening a tab.
 *
 * New accounts can show a multi-step tutorial, while migrated accounts may only
 * show a single release note. Smoke tests are not validating tutorial content,
 * so they walk through or skip visible tutorial controls until normal app
 * clicks are no longer blocked.
 */
async function dismissTutorialIfVisible(page) {
  const closePattern = /Pular|Skip|Fechar|Close|Concluir|Finish/i;
  const nextPattern = /Pr[oó]ximo|Next|Ir ao tutorial|Go to tutorial/i;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const closeButton = page.getByRole('button', { name: closePattern }).first();
    if (await closeButton.isVisible({ timeout: 300 }).catch(() => false)) {
      await closeButton.click({ force: true });
      await page.waitForTimeout(150);
      continue;
    }

    const nextButton = page.getByRole('button', { name: nextPattern }).first();
    if (await nextButton.isVisible({ timeout: 300 }).catch(() => false)) {
      await nextButton.click({ force: true });
      await page.waitForTimeout(150);
      continue;
    }

    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(100);
    break;
  }
}

async function clickFirstButtonMatching(page, pattern) {
  const button = page.locator('button').filter({ hasText: pattern }).first();
  await expect(button).toBeVisible();
  await button.click();
}

async function clickByTutorialKeyOrText(page, tutorialKey, fallbackPattern) {
  await dismissTutorialIfVisible(page);

  const tutorialTarget = page.locator(`[data-tutorial="${tutorialKey}"]`).first();

  if (await tutorialTarget.isVisible({ timeout: 1000 }).catch(() => false)) {
    await tutorialTarget.click({ timeout: 5000 });
    return;
  }

  await clickFirstButtonMatching(page, fallbackPattern);
}

test.afterEach(async ({ request }) => {
  await request.get('/index.html').catch(() => {});
});

test.describe('public boot and login screen', () => {
  test('boots without startup errors and renders login controls', async ({ page }) => {
    const errors = await openApp(page);

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Entrar|Sign in/i }).last()).toBeVisible();

    await expectNoCriticalErrors(errors);
  });

  test('language toggle updates login copy and persists after reload', async ({ page }) => {
    const errors = await openApp(page);

    const englishButton = page.getByRole('button', { name: /EN-US/i });
    await expect(englishButton).toBeVisible();
    await englishButton.click();
    await expect(page.getByRole('button', { name: /Forgot password/i })).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 10000 });
    await expect(page.getByRole('button', { name: /Forgot password/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /EN-US/i })).toBeVisible();

    await expectNoCriticalErrors(errors);
  });

  test('saved theme remains active after reload', async ({ page }) => {
    const errors = await openApp(page);

    await page.evaluate(() => localStorage.setItem('appDarkMode', 'true'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.evaluate(() => localStorage.setItem('appDarkMode', 'false'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await expectNoCriticalErrors(errors);
  });

  test('password recovery validates an empty email instead of failing silently', async ({ page }) => {
    const errors = await openApp(page);

    await page.getByRole('button', { name: /Esqueci minha senha|Forgot password/i }).click();

    await expect(page.getByText(/Digite seu e-mail|Enter your email/i)).toBeVisible();

    await expectNoCriticalErrors(errors);
  });
});

test.describe('authenticated app smoke tests', () => {
  test.skip(
    !HAS_AUTH_CREDENTIALS,
    'set NUTRITION_TEST_EMAIL and NUTRITION_TEST_PASSWORD to run authenticated smoke tests'
  );

  test('opens the main tabs without rendering blank sections', async ({ page }) => {
    const errors = await openApp(page);
    await login(page);

    const tabs = [
      {
        tutorialKey: 'tab-diario',
        label: /Di.rio|Diary/i,
        expectedContent: /Prote.na|Protein|Calorias|Calories|Nutrientes|Nutrients/i
      },
      {
        tutorialKey: 'tab-despensa',
        label: /Alimentos|Foods|Pantry/i,
        expectedContent: /Salvos|Saved|Suplementos|Supplements|Novo alimento|New food/i
      },
      {
        tutorialKey: 'tab-semana',
        label: /Semana|Week/i,
        expectedContent: /ltimos 7 dias|Last 7 days|M.dia|Average|Prote.na|Protein|Calorias|Calories/i
      },
      {
        tutorialKey: 'tab-metricas',
        label: /M.tricas|Metrics/i,
        expectedContent: /Acompanhamento|Tracking|Metas|Goals|Hist.rico|History/i
      }
    ];

    for (const tab of tabs) {
      await clickByTutorialKeyOrText(page, tab.tutorialKey, tab.label);
      await dismissTutorialIfVisible(page);
      await expect(page.locator('#root')).toContainText(tab.expectedContent, { timeout: 10000 });
    }

    await expectNoCriticalErrors(errors);
  });

  test('opens settings and backup modal', async ({ page }) => {
    const errors = await openApp(page);
    await login(page);

    await clickByTutorialKeyOrText(page, 'menu-settings', /Settings|Configura/i);
    await clickFirstButtonMatching(page, /Backup e restaurar|Backup & restore/i);

    await expect(page.getByText(/Backup|Importar|Exportar|Restore|Import|Export/i).first()).toBeVisible();

    await expectNoCriticalErrors(errors);
  });

  test('signs out and returns to the login screen', async ({ page }) => {
    const errors = await openApp(page);
    await login(page);

    await clickByTutorialKeyOrText(page, 'menu-settings', /Settings|Configura/i);
    await clickFirstButtonMatching(page, /Sair|Sign out|Log out/i);

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Entrar|Sign in/i }).last()).toBeVisible();

    await expectNoCriticalErrors(errors);
  });
});
