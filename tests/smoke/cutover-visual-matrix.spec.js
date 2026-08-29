const crypto = require('node:crypto');
const { test, expect } = require('@playwright/test');
const { isIgnorableConsoleError } = require('./test-helpers');

const ORIGINS = {
  legacy: 'http://127.0.0.1:8775',
  vite: 'http://127.0.0.1:8776'
};

const SCREENS = [
  { key: 'diario', selector: '[data-screen="diario"]' },
  { key: 'adicionar', selector: '[data-app-main="adicionar"]' },
  { key: 'despensa', selector: '[data-screen="despensa"]' },
  { key: 'semana', selector: '[data-screen="semana"]' },
  { key: 'metricas', selector: '[data-screen="metricas"]' }
];

const LANGUAGES = ['pt', 'en', 'es'];
const VIEWPORTS = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 393, height: 851 }
};
const THEMES = ['light', 'dark'];
const FIXED_NOW = '2026-07-26T12:00:00.000Z';

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function describeComputedStyleDifferences(legacyStyles, viteStyles) {
  const legacyLines = legacyStyles.split('\n');
  const viteLines = viteStyles.split('\n');
  const differences = [];
  const lineCount = Math.max(legacyLines.length, viteLines.length);

  for (let index = 0; index < lineCount && differences.length < 12; index += 1) {
    if (legacyLines[index] === viteLines[index]) continue;
    const legacyParts = (legacyLines[index] || '').split('|');
    const viteParts = (viteLines[index] || '').split('|');
    const propertyCount = Math.max(legacyParts.length, viteParts.length);
    for (let propertyIndex = 1; propertyIndex < propertyCount && differences.length < 12; propertyIndex += 1) {
      if (legacyParts[propertyIndex] !== viteParts[propertyIndex]) {
        differences.push(
          `element ${index} ${legacyParts[0] || viteParts[0]}: `
          + `legacy ${legacyParts[propertyIndex] || '(missing)'}; `
          + `Vite ${viteParts[propertyIndex] || '(missing)'}`,
        );
      }
    }
  }

  return differences;
}

function describeDomDifference(legacyHtml, viteHtml) {
  const length = Math.max(legacyHtml.length, viteHtml.length);
  let index = 0;
  while (index < length && legacyHtml[index] === viteHtml[index]) index += 1;
  const start = Math.max(0, index - 160);
  const end = index + 320;
  return [
    `first difference at character ${index}`,
    `legacy: ${legacyHtml.slice(start, end)}`,
    `Vite: ${viteHtml.slice(start, end)}`,
  ].join('\n');
}

async function installDeterministicBrowserState(page, language, theme) {
  await page.addInitScript(({ fixedNow, languageCode, themeName }) => {
    const NativeDate = Date;
    const fixedTime = new NativeDate(fixedNow).getTime();
    class FixedDate extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [fixedTime]));
      }
      static now() {
        return fixedTime;
      }
    }
    FixedDate.parse = NativeDate.parse;
    FixedDate.UTC = NativeDate.UTC;
    window.Date = FixedDate;

    localStorage.clear();
    localStorage.setItem('appLang', languageCode);
    localStorage.setItem('appDarkMode', String(themeName === 'dark'));
    localStorage.setItem('appThemeDefaultDarkV1', '1');
  }, { fixedNow: FIXED_NOW, languageCode: language, themeName: theme });
}

async function installDeterministicServices(page) {
  await page.evaluate(() => {
    window.__cutoverProfile = {
      'seenVisualUpdateNotice_0.8.1': 'true',
      tutorial_most_recent_version_seen: '0.10.0-beta',
      tutorialSeen_main: 'true',
      tutorialSeen_diario: 'true',
      tutorialSeen_adicionar: 'true',
      tutorialSeen_despensa: 'true',
      tutorialSeen_semana: 'true',
      tutorialSeen_metricas: 'true'
    };
    window.fbSignIn = async email => localStorage.setItem('fb_email', email);
    window.fbCheckEmailVerified = async () => true;
    window.storage.get = async key => (
      Object.prototype.hasOwnProperty.call(window.__cutoverProfile, key)
        ? { value: window.__cutoverProfile[key] }
        : null
    );
    window.storage.set = async (key, value) => {
      window.__cutoverProfile[key] = value;
      return true;
    };
    window.storage.delete = async key => {
      delete window.__cutoverProfile[key];
      return true;
    };
    window.storage.getMany = async keys => Object.fromEntries(
      keys.map(key => [key, Object.prototype.hasOwnProperty.call(window.__cutoverProfile, key)
        ? { value: window.__cutoverProfile[key] }
        : null])
    );
    window.storage.readDailyStateCompatible = async () => ({
      log: {},
      waterIntake: [],
      supplementLog: []
    });
    window.storage.migrateDailyEntries = async () => ({ migrated: false });
    window.storage.subscribeMany = () => () => {};
  });
}

async function authenticateAndCompleteProfile(page) {
  await page.locator('input[type="email"]').fill('cutover@example.test');
  await page.locator('input[type="password"]').fill('secret123');
  await page.getByRole('button', { name: /Entrar|Sign in|Iniciar sesi[oó]n/i }).last().click();

  await expect(page.locator('input[type="date"]')).toBeVisible();
  await page.locator('input[type="date"]').fill('1990-06-15');
  await page.locator('select').nth(0).selectOption('female');
  await page.locator('select').nth(1).selectOption('moderate');
  await page.locator('select').nth(2).selectOption('maintenance');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('[data-screen="diario"]')).toBeVisible({ timeout: 15000 });
}

async function openScreen(page, screen) {
  if (screen.key === 'diario') return;
  if (screen.key === 'adicionar') {
    await page.getByRole('button', {
      name: /^\+\s*(Adicionar|Add|Agregar)$/i
    }).first().evaluate(button => button.click());
  } else {
    await page.locator(`[data-tutorial="tab-${screen.key}"]`).click();
  }
  await expect(page.locator(screen.selector)).toBeVisible({ timeout: 10000 });
}

async function stabilize(page) {
  await page.addStyleTag({
    content: `
      html [data-one-ui-root] *,
      html [data-one-ui-root] *::before,
      html [data-one-ui-root] *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `
  });
  await page.evaluate(() => document.fonts?.ready);
  await page.locator('#root').evaluate(root => new Promise((resolve, reject) => {
    const minimumWaitMs = 2500;
    const quietWindowMs = 1200;
    const timeoutMs = 12000;
    const startedAt = performance.now();
    let lastMutationAt = startedAt;
    const observer = new MutationObserver(() => {
      lastMutationAt = performance.now();
    });
    observer.observe(root, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });

    const poll = setInterval(() => {
      const now = performance.now();
      if (now - startedAt >= timeoutMs) {
        clearInterval(poll);
        observer.disconnect();
        reject(new Error('root did not reach DOM quiescence before comparison'));
        return;
      }
      if (now - startedAt >= minimumWaitMs && now - lastMutationAt >= quietWindowMs) {
        clearInterval(poll);
        observer.disconnect();
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }
    }, 50);
  }));
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForFunction(() => document.getAnimations().every(
    animation => animation.playState !== 'running' && animation.playState !== 'pending'
  ));
}

async function captureStableScreenshot(page) {
  let previous = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const current = await page.screenshot({ animations: 'disabled' });
    const currentHash = digest(current);
    if (currentHash === previous) return { buffer: current, hash: currentHash };
    previous = currentHash;
    await page.waitForTimeout(200);
  }
  throw new Error('screen did not stabilize before comparison');
}

async function renderCase(page, origin, screen) {
  const errors = [];
  const handleConsole = message => {
    if (
      message.type() === 'error'
      && !isIgnorableConsoleError(message.text(), message.location().url)
    ) {
      errors.push(message.text());
    }
  };
  const handlePageError = error => errors.push(error.message);
  page.on('console', handleConsole);
  page.on('pageerror', handlePageError);

  try {
    await page.goto(`${origin}/index.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
    await installDeterministicServices(page);
    await authenticateAndCompleteProfile(page);
    await openScreen(page, screen);
    await stabilize(page);

    const rootHtml = await page.locator('#root').evaluate(element => element.innerHTML);
    const computedStyles = await page.locator('#root').evaluate(element => (
      [element, ...element.querySelectorAll('*')].map((node, index) => {
        const style = getComputedStyle(node);
        const identity = [
          `${node.tagName}@${index}`,
          node.id ? `#${node.id}` : '',
          node.classList.length ? `.${Array.from(node.classList).join('.')}` : '',
          node.hasAttribute('data-screen') ? `[data-screen=${node.getAttribute('data-screen')}]` : '',
          node.hasAttribute('data-tutorial') ? `[data-tutorial=${node.getAttribute('data-tutorial')}]` : '',
        ].join('');
        return [
          identity,
          ...Array.from(style)
            .filter(property => !property.startsWith('--'))
            .map(property => `${property}:${style.getPropertyValue(property)}`),
        ].join('|');
      }).join('\n')
    ));
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          -webkit-backdrop-filter: none !important;
          backdrop-filter: none !important;
        }
        html, body, * {
          scrollbar-width: none !important;
        }
        *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `
    });
    await page.waitForTimeout(200);
    const screenshot = await captureStableScreenshot(page);
    return {
      computedStyles,
      computedStyleHash: digest(computedStyles),
      errors,
      rootHtml,
      htmlHash: digest(rootHtml),
      screenshotBuffer: screenshot.buffer,
      screenshotHash: screenshot.hash
    };
  } finally {
    page.off('console', handleConsole);
    page.off('pageerror', handlePageError);
  }
}

async function renderFreshCase(context, origin, screen, language, theme) {
  const page = await context.newPage();
  try {
    await installDeterministicBrowserState(page, language, theme);
    return await renderCase(page, origin, screen);
  } finally {
    await page.close();
  }
}

test.describe.configure({ mode: 'serial' });

for (const screen of SCREENS) {
  for (const language of LANGUAGES) {
    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      for (const theme of THEMES) {
        test(`${screen.key} ${language} ${viewportName} ${theme}`, async ({ browser }, testInfo) => {
          const context = await browser.newContext({ viewport });
          try {
            const legacy = await renderFreshCase(
              context,
              ORIGINS.legacy,
              screen,
              language,
              theme,
            );
            const vite = await renderFreshCase(
              context,
              ORIGINS.vite,
              screen,
              language,
              theme,
            );

            expect(legacy.errors, 'legacy browser errors').toEqual([]);
            expect(vite.errors, 'Vite browser errors').toEqual([]);
            if (vite.htmlHash !== legacy.htmlHash) {
              throw new Error(
                `DOM differs from the frozen legacy loader:\n`
                + describeDomDifference(legacy.rootHtml, vite.rootHtml),
              );
            }
            if (vite.computedStyleHash !== legacy.computedStyleHash) {
              throw new Error(
                `computed styles differ from the frozen legacy loader:\n`
                + describeComputedStyleDifferences(legacy.computedStyles, vite.computedStyles).join('\n'),
              );
            }
            if (vite.screenshotHash !== legacy.screenshotHash) {
              await testInfo.attach('legacy-render', {
                body: legacy.screenshotBuffer,
                contentType: 'image/png',
              });
              await testInfo.attach('vite-render', {
                body: vite.screenshotBuffer,
                contentType: 'image/png',
              });
              expect(vite.screenshotHash, 'rendered pixels differ from the frozen legacy loader')
                .toBe(legacy.screenshotHash);
            }
          } finally {
            await context.close();
          }
        });
      }
    }
  }
}
