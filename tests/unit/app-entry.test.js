'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '..', '..');
const appSource = fs.readFileSync(path.join(repositoryRoot, 'src', 'App.jsx'), 'utf8');
const mainSource = fs.readFileSync(path.join(repositoryRoot, 'src', 'main.jsx'), 'utf8');
const viteHtmlSource = fs.readFileSync(path.join(repositoryRoot, 'index.vite.html'), 'utf8');
const viteConfigSource = fs.readFileSync(path.join(repositoryRoot, 'vite.config.js'), 'utf8');

function matches(pattern, source = appSource) {
  return [...source.matchAll(pattern)];
}

test('preserves the App hook and helper-function contract', () => {
  assert.equal(matches(/React\.useState\(/g).length, 15);
  assert.equal(matches(/React\.useEffect\(/g).length, 3);

  assert.deepEqual(
    matches(/(?:async\s+)?function\s+(toggleLang|toggleDark|handleLogout|checkRequiredProfile|normalizeStorageAfterLogin|checkVisualUpdateNotice|afterAuthenticated)\s*\(/g)
      .map(match => match[1]),
    [
      'toggleLang',
      'toggleDark',
      'handleLogout',
      'checkRequiredProfile',
      'normalizeStorageAfterLogin',
      'checkVisualUpdateNotice',
      'afterAuthenticated',
    ],
  );

  assert.match(appSource, /\}, \[darkMode\]\);/);
  assert.match(appSource, /\}, \[\]\);/);
  assert.match(
    appSource,
    /\}, \[checking, profileChecking, authed, pendingEmail, requiredProfile, lang\]\);/,
  );
});

test('preserves the frozen authentication, migration, and profile gates', () => {
  assert.match(appSource, /window\.normalizeCurrentUserStorage\(\{ cleanup: true \}\)/);
  assert.match(appSource, /background: true \}\), 2500/);
  assert.match(appSource, /const timeout = setTimeout\(\(\) => \{[\s\S]*?\}, 8000\);/);
  assert.match(appSource, /if \(checking \|\| profileChecking\) return null;/);
  assert.match(appSource, /if \(pendingEmail\) \{/);
  assert.match(appSource, /if \(!authed\) \{/);
  assert.match(appSource, /requiredProfile \? \([\s\S]*?<RequiredProfileModal/);
  assert.match(appSource, /\{!requiredProfile && \([\s\S]*?<NutritionTracker/);
  assert.match(appSource, /<ErrorBoundary>[\s\S]*?<RequiredProfileModal/);
});

test('installs exactly the twelve ESM namespaces still resolved by the controller', () => {
  const assignment = appSource.match(/Object\.assign\(globalThis, \{([\s\S]*?)\}\);/);
  assert.ok(assignment);
  assert.deepEqual(
    matches(/^\s{2}([A-Za-z][A-Za-z0-9]*),$/gm, assignment[1]).map(match => match[1]),
    [
      'AutosaveScheduler',
      'BarcodeScanner',
      'DishDescriptionAI',
      'EatingPatternsAI',
      'FoodAutofillAI',
      'FoodEntry',
      'HistoryLoaders',
      'MealGA',
      'MealReviewAI',
      'MealScore',
      'NutritionFeedbackAI',
      'SavedMealCardModule',
    ],
  );
});

test('uses a single JSX bootstrap without StrictMode or createElement', () => {
  assert.doesNotMatch(appSource, /React\.createElement/);
  assert.doesNotMatch(mainSource, /React\.createElement|StrictMode/);
  assert.match(mainSource, /createRoot\(document\.getElementById\('root'\)\)/);
  assert.match(mainSource, /root\.render\(<App \/>\);/);
  assert.match(viteHtmlSource, /<script type="module" src="\/src\/main\.jsx"><\/script>/);
  assert.doesNotMatch(viteHtmlSource, /vite-baseline\.js|app\.js/);
  assert.match(viteConfigSource, /react\(\{ jsxRuntime: 'classic' \}\)/);
});
