'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '..', '..');
const appSource = fs.readFileSync(path.join(repositoryRoot, 'src', 'App.jsx'), 'utf8');
const legacyAppSource = fs.readFileSync(path.join(repositoryRoot, 'app.js'), 'utf8');
const legacyMirrorSource = fs.readFileSync(path.join(repositoryRoot, 'nutrition-tracker.jsx'), 'utf8');
const mainSource = fs.readFileSync(path.join(repositoryRoot, 'src', 'main.jsx'), 'utf8');
const nativeScannerCssSource = fs.readFileSync(
  path.join(repositoryRoot, 'src', 'native-barcode-scanner.css'),
  'utf8',
);
const productionHtmlSource = fs.readFileSync(path.join(repositoryRoot, 'index.html'), 'utf8');
const legacyHtmlSource = fs.readFileSync(
  path.join(repositoryRoot, 'tests', 'fixtures', 'index.legacy.html'),
  'utf8',
);
const viteConfigSource = fs.readFileSync(path.join(repositoryRoot, 'vite.config.js'), 'utf8');

function matches(pattern, source = appSource) {
  return [...source.matchAll(pattern)];
}

test('preserves the App hook and helper-function contract', () => {
  assert.equal(matches(/React\.useState\(/g).length, 16);
  assert.equal(matches(/React\.useEffect\(/g).length, 5);

  assert.deepEqual(
    matches(/(?:async\s+)?function\s+(toggleLang|toggleDark|handleLogout|checkRequiredProfile|checkVisualUpdateNotice|afterAuthenticated)\s*\(/g)
      .map(match => match[1]),
    [
      'toggleLang',
      'toggleDark',
      'handleLogout',
      'checkRequiredProfile',
      'checkVisualUpdateNotice',
      'afterAuthenticated',
    ],
  );

  assert.match(appSource, /\}, \[darkMode\]\);/);
  assert.match(appSource, /\}, \[\]\);/);
  assert.match(
    appSource,
    /\}, \[checking, profileChecking, authed, pendingEmail, requiredProfile, profileLoadError, lang\]\);/,
  );
});

test('preserves the authentication and profile gates without legacy normalization', () => {
  for (const source of [appSource, legacyAppSource, legacyMirrorSource]) {
    assert.doesNotMatch(source, /normalizeStorageAfterLogin|normalizeCurrentUserStorage|cleanupLegacyNutritionDocs/);
  }
  assert.match(appSource, /const timeout = setTimeout\(\(\) => \{[\s\S]*?\}, 8000\);/);
  assert.match(appSource, /if \(checking \|\| profileChecking\) return null;/);
  assert.match(appSource, /if \(pendingEmail\) \{/);
  assert.match(appSource, /if \(!authed\) \{/);
  assert.match(appSource, /requiredProfile \? \([\s\S]*?<RequiredProfileModal/);
  assert.match(appSource, /profileLoadError \? \([\s\S]*?<RequiredProfileReadError/);
  assert.match(appSource, /\{!requiredProfile && !profileLoadError && \([\s\S]*?<NutritionTracker/);
  assert.match(appSource, /<ErrorBoundary>[\s\S]*?<RequiredProfileModal/);
  assert.doesNotMatch(appSource, /getRequiredProfileData\(\)\.catch\(\(\) => \(\{/);
  assert.match(appSource, /setProfileLoadError\(profileReadErrorCode\(error\)\)/);
  assert.match(appSource, /await ensureAppCheckInitialized\(\)/);
});

test('installs exactly the fifteen ESM namespaces still resolved by the controller', () => {
  const assignment = appSource.match(/Object\.assign\(globalThis, \{([\s\S]*?)\}\);/);
  assert.ok(assignment);
  assert.deepEqual(
    matches(/^\s{2}([A-Za-z][A-Za-z0-9]*),$/gm, assignment[1]).map(match => match[1]),
    [
      'AutosaveScheduler',
      'BarcodeScanner',
      'DishDescriptionAI',
      'DailyEntryModel',
      'DailyEntryPersistence',
      'EatingPatternsAI',
      'FoodAutofillAI',
      'FoodEntry',
      'HistoryLoaders',
      'MealGA',
      'MealReviewAI',
      'MealScore',
      'NutritionFeedbackAI',
      'PantrySuggestionsAI',
      'SavedMealCardModule',
    ],
  );
});

test('uses a single JSX bootstrap without StrictMode or createElement', () => {
  assert.doesNotMatch(appSource, /React\.createElement/);
  assert.doesNotMatch(mainSource, /React\.createElement|StrictMode/);
  assert.match(mainSource, /createRoot\(document\.getElementById\('root'\)\)/);
  assert.equal((mainSource.match(/root\.render\(/g) || []).length, 1);
  assert.match(mainSource, /root\.render\([\s\S]*?<App \/>/);
  assert.doesNotMatch(mainSource, /NativeBarcodeScannerSpikePanel|Testar scanner nativo/);
  assert.match(appSource, /import \* as BarcodeScanner from '\.\/composite\/barcode-scanner-runtime\.js'/);
  assert.match(productionHtmlSource, /<script type="module" src="\/src\/main\.jsx"><\/script>/);
  assert.doesNotMatch(productionHtmlSource, /vite-baseline\.js|app\.js|\?v=/);
  assert.match(viteConfigSource, /react\(\{ jsxRuntime: 'classic' \}\)/);
});

test('keeps the native scanner overlay viewport-bound and theme-aware', () => {
  assert.match(appSource, /nativeBarcodePortal:[\s\S]*?createPortal\(node, document\.body\)/);
  assert.match(nativeScannerCssSource, /\.phrona-native-barcode-scanner-flow[\s\S]*?background: var\(--surface-block\) !important/);
  assert.match(nativeScannerCssSource, /\.phrona-barcode-video-anchor[\s\S]*?display: none !important/);
  assert.doesNotMatch(nativeScannerCssSource, /\.phrona-native-barcode-scanner-flow::before/);
});

test('keeps one production ESM entry and a separate frozen legacy loader', () => {
  assert.equal((productionHtmlSource.match(/<script\b/g) || []).length, 3);
  assert.equal((productionHtmlSource.match(/<script\b[^>]*\bsrc=/g) || []).length, 1);
  assert.equal((legacyHtmlSource.match(/<script\b/g) || []).length, 70);
  assert.equal((legacyHtmlSource.match(/<script\b[^>]*\bsrc=/g) || []).length, 68);
  assert.match(legacyHtmlSource, /src="vendor\/react\.production\.min\.js"/);
  assert.match(legacyHtmlSource, /src="daily-entry-model\.js\?v=/);
  assert.match(legacyHtmlSource, /src="daily-entry-persistence\.js\?v=/);
  assert.match(legacyHtmlSource, /src="choice-field\.js\?v=/);
  assert.match(legacyHtmlSource, /src="searchable-choice-field\.js\?v=/);
  assert.match(legacyHtmlSource, /src="temporal-field\.js\?v=/);
  assert.match(legacyHtmlSource, /src="selection-controls\.js\?v=/);
  assert.match(legacyHtmlSource, /src="meal-estimate\.js\?v=/);
  assert.match(legacyHtmlSource, /src="meal-estimate-editor\.js\?v=/);
  assert.match(legacyHtmlSource, /src="pantry-suggestions-ai\.js\?v=/);
  assert.match(legacyHtmlSource, /src="app\.js\?v=/);
});

test('loads the structured pantry suggestion adapter before the legacy controller', () => {
  const pantrySuggestionPosition = legacyHtmlSource.indexOf('src="pantry-suggestions-ai.js');
  const controllerPosition = legacyHtmlSource.indexOf('src="nutrition-tracker-controller.js');

  assert.notEqual(pantrySuggestionPosition, -1);
  assert.notEqual(controllerPosition, -1);
  assert.ok(pantrySuggestionPosition < controllerPosition);
});

test('loads the daily entry mutation runtime before the legacy controller', () => {
  const dailyEntryPosition = legacyHtmlSource.indexOf('src="daily-entry-model.js');
  const dailyPersistencePosition = legacyHtmlSource.indexOf('src="daily-entry-persistence.js');
  const controllerPosition = legacyHtmlSource.indexOf('src="nutrition-tracker-controller.js');

  assert.notEqual(dailyEntryPosition, -1);
  assert.notEqual(controllerPosition, -1);
  assert.notEqual(dailyPersistencePosition, -1);
  assert.ok(dailyEntryPosition < controllerPosition);
  assert.ok(dailyPersistencePosition < controllerPosition);
});

test('loads the reusable ChoiceField before the Add screen in legacy mode', () => {
  const choiceFieldPosition = legacyHtmlSource.indexOf('src="choice-field.js');
  const addScreenPosition = legacyHtmlSource.indexOf('src="add-screen.js');

  assert.notEqual(choiceFieldPosition, -1);
  assert.notEqual(addScreenPosition, -1);
  assert.ok(choiceFieldPosition < addScreenPosition);
});

test('loads SearchableChoiceField before its dynamic legacy consumers', () => {
  const searchablePosition = legacyHtmlSource.indexOf('src="searchable-choice-field.js');
  const diaryPosition = legacyHtmlSource.indexOf('src="diary-screen.js');
  const controllerPosition = legacyHtmlSource.indexOf('src="nutrition-tracker-controller.js');

  assert.notEqual(searchablePosition, -1);
  assert.ok(searchablePosition < diaryPosition);
  assert.ok(searchablePosition < controllerPosition);
});

test('loads TemporalField before the Add screen in legacy mode', () => {
  const temporalPosition = legacyHtmlSource.indexOf('src="temporal-field.js');
  const addScreenPosition = legacyHtmlSource.indexOf('src="add-screen.js');

  assert.notEqual(temporalPosition, -1);
  assert.notEqual(addScreenPosition, -1);
  assert.ok(temporalPosition < addScreenPosition);
});

test('loads SelectionControls before its legacy consumers', () => {
  const controlsPosition = legacyHtmlSource.indexOf('src="selection-controls.js');
  const backupPosition = legacyHtmlSource.indexOf('src="backup-modal.js');
  const diaryPosition = legacyHtmlSource.indexOf('src="diary-screen.js');

  assert.notEqual(controlsPosition, -1);
  assert.ok(controlsPosition < backupPosition);
  assert.ok(controlsPosition < diaryPosition);
});
