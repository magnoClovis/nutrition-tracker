'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
const gradle = read('android/app/build.gradle');
const legacyApp = read('app.js');
const legacyMirror = read('nutrition-tracker.jsx');
const viteApp = read('src/App.jsx');
const tutorial = read('tutorial-overlay.js');
const productionHtml = read('index.html');
const legacyHtml = read('tests/fixtures/index.legacy.html');
const { CURRENT_RELEASE } = require('../../release-notice.js');

test('keeps every committed 0.10.0-beta version reference synchronized', () => {
  const androidVersion = gradle.match(/^\s*versionName\s+"([^"]+)"/m)?.[1];

  assert.equal(packageJson.version, '0.10.0-beta');
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages[''].version, packageJson.version);
  assert.equal(androidVersion, packageJson.version);
  assert.equal(CURRENT_RELEASE.id, packageJson.version);
  assert.equal(CURRENT_RELEASE.versionName, packageJson.version);
  assert.equal(CURRENT_RELEASE.label, 'Trofia v0.10.0 Beta');
  assert.equal(CURRENT_RELEASE.tutorialType, null);
  assert.match(productionHtml, /window\.APP_VERSION_LABEL = 'Trofia v0\.10\.0 Beta'/);
  assert.match(legacyHtml, /window\.APP_VERSION_LABEL = 'Trofia v0\.10\.0 Beta'/);
});

test('derives all runtime labels and tutorial routing from the release contract', () => {
  for (const source of [legacyApp, legacyMirror]) {
    assert.match(source, /const CURRENT_RELEASE = window\.ReleaseNotice\.CURRENT_RELEASE;/);
    assert.match(source, /APP_VERSION_LABEL = window\.APP_VERSION_LABEL \|\| CURRENT_RELEASE\.label/);
    assert.match(source, /CURRENT_RELEASE_ID = CURRENT_RELEASE\.id/);
    assert.doesNotMatch(source, /CURRENT_RELEASE_TUTORIAL_VERSION|RELEASE_TUTORIAL_TYPE|release080/);
  }

  assert.match(viteApp, /const CURRENT_RELEASE = ReleaseNotice\.CURRENT_RELEASE;/);
  assert.match(viteApp, /APP_VERSION_LABEL = window\.APP_VERSION_LABEL \|\| CURRENT_RELEASE\.label/);
  assert.match(viteApp, /CURRENT_RELEASE_ID = CURRENT_RELEASE\.id/);
  assert.doesNotMatch(viteApp, /CURRENT_RELEASE_TUTORIAL_VERSION|RELEASE_TUTORIAL_TYPE|release080/);
  assert.doesNotMatch(tutorial, /release080/);
  assert.match(tutorial, /'release-highlights'/);
  assert.equal(legacyApp, legacyMirror);
});

test('queues the same notice before choosing the new or existing user tutorial', () => {
  for (const source of [legacyApp, viteApp]) {
    assert.match(source, /if \(!hasSeenCurrentRelease\(tutorialVersion\)\) \{\s*releaseAudienceRef\.current = isNew \? ['"]new['"] : ['"]existing['"];\s*setShowReleaseNotice\(true\);\s*return;/);
    assert.match(source, /resolveReleaseTutorialType\(releaseAudienceRef\.current, CURRENT_RELEASE\)/);
    assert.match(source, /if \(releaseAudienceRef\.current\) \{\s*markCurrentReleaseSeen\(\);\s*releaseAudienceRef\.current = null;/);
  }
});

test('does not mark the release complete while merely opening its notice', () => {
  for (const source of [legacyApp, viteApp]) {
    const unseenBlock = source.match(/if \(!hasSeenCurrentRelease\(tutorialVersion\)\) \{([\s\S]*?)\n\s*\}/)?.[1] || '';
    assert.match(unseenBlock, /setShowReleaseNotice\(true\)/);
    assert.doesNotMatch(unseenBlock, /markCurrentReleaseSeen/);
  }
});

test('finishes an existing-user notice without opening a release tutorial when none is configured', () => {
  for (const source of [legacyApp, viteApp]) {
    assert.match(source, /if \(nextTutorialType\) \{[\s\S]*?setShowTutorial\(true\);[\s\S]*?\} else \{\s*if \(releaseAudienceRef\.current\) \{\s*markCurrentReleaseSeen\(\);\s*releaseAudienceRef\.current = null;/);
    assert.doesNotMatch(source, /else \{\s*setShowReleaseNotice\(true\);/);
  }
});
