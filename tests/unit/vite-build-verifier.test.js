'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  REQUIRED_OUTPUT_FILES,
  verifyBuildDirectory,
} = require('../../scripts/verify-vite-build.js');

function createValidBuildFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nutrition-vite-build-'));

  for (const relativePath of REQUIRED_OUTPUT_FILES) {
    const absolutePath = path.join(directory, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, '');
  }

  fs.mkdirSync(path.join(directory, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'assets', 'baseline.js'), '');
  fs.writeFileSync(path.join(directory, 'assets', 'style.css'), '');
  return directory;
}

test('accepts only the explicit baseline runtime and generated assets', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  assert.doesNotThrow(() => verifyBuildDirectory(directory));
});

test('rejects files outside the build allowlist', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'STABILITY_TODO.md'), '');

  assert.throws(
    () => verifyBuildDirectory(directory),
    /sensitive file pattern detected: STABILITY_TODO\.md/,
  );
});

test('rejects known personal-data export names even inside assets', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'assets', 'nutrition-full-raw.json'), '');

  assert.throws(
    () => verifyBuildDirectory(directory),
    /sensitive file pattern detected: assets\/nutrition-full-raw\.json/,
  );
});

test('rejects a build missing an explicitly required runtime', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.rmSync(path.join(directory, 'settings-panel.js'));

  assert.throws(
    () => verifyBuildDirectory(directory),
    /missing required output: settings-panel\.js/,
  );
});

test('rejects vendored React runtimes from the Vite artifact', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const vendoredRuntime = path.join(directory, 'vendor', 'react.production.min.js');
  fs.mkdirSync(path.dirname(vendoredRuntime), { recursive: true });
  fs.writeFileSync(vendoredRuntime, '');

  assert.throws(
    () => verifyBuildDirectory(directory),
    /file is outside the build allowlist: vendor\/react\.production\.min\.js/,
  );
});

test('rejects converted leaf UMD files from the Vite artifact', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'hydration-guard.js'), '');

  assert.throws(
    () => verifyBuildDirectory(directory),
    /file is outside the build allowlist: hydration-guard\.js/,
  );
});

test('rejects converted composite UMD files from the Vite artifact', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'barcode-scanner.js'), '');

  assert.throws(
    () => verifyBuildDirectory(directory),
    /file is outside the build allowlist: barcode-scanner\.js/,
  );
});

test('rejects converted Firebase-internal UMD files from the Vite artifact', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'firebase-migration-internal.js'), '');

  assert.throws(
    () => verifyBuildDirectory(directory),
    /file is outside the build allowlist: firebase-migration-internal\.js/,
  );
});

test('rejects the converted Firebase storage UMD file from the Vite artifact', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'firebase-storage.js'), '');

  assert.throws(
    () => verifyBuildDirectory(directory),
    /file is outside the build allowlist: firebase-storage\.js/,
  );
});
