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
    fs.writeFileSync(
      absolutePath,
      relativePath === 'index.html'
        ? '<link rel="stylesheet" href="./assets/style-abc123.css"><style>body{color:black}</style><script type="module" src="./assets/baseline-abc123.js"></script>'
        : '',
    );
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

test('rejects a build missing an explicitly required static file', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.rmSync(path.join(directory, 'manifest.json'));

  assert.throws(
    () => verifyBuildDirectory(directory),
    /missing required output: manifest\.json/,
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

test('rejects converted React component UMD files from the Vite artifact', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'ui-primitives.js'), '');

  assert.throws(
    () => verifyBuildDirectory(directory),
    /file is outside the build allowlist: ui-primitives\.js/,
  );
});

test('rejects converted React support-component UMD files from the Vite artifact', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'body-metrics-charts.js'), '');

  assert.throws(
    () => verifyBuildDirectory(directory),
    /file is outside the build allowlist: body-metrics-charts\.js/,
  );
});

test('rejects converted React modal UMD files from the Vite artifact', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'backup-modal.js'), '');

  assert.throws(
    () => verifyBuildDirectory(directory),
    /file is outside the build allowlist: backup-modal\.js/,
  );
});

test('rejects converted React authentication UMD files from the Vite artifact', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'privacy-panel.js'), '');

  assert.throws(
    () => verifyBuildDirectory(directory),
    /file is outside the build allowlist: privacy-panel\.js/,
  );
});

test('rejects converted React screen UMD files from the Vite artifact', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'pantry-screen.js'), '');

  assert.throws(
    () => verifyBuildDirectory(directory),
    /file is outside the build allowlist: pantry-screen\.js/,
  );
});

test('rejects converted React navigation-screen UMD files from the Vite artifact', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'diary-screen.js'), '');

  assert.throws(
    () => verifyBuildDirectory(directory),
    /file is outside the build allowlist: diary-screen\.js/,
  );
});

test('rejects the converted NutritionTracker controller UMD file from the Vite artifact', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'nutrition-tracker-controller.js'), '');

  assert.throws(
    () => verifyBuildDirectory(directory),
    /file is outside the build allowlist: nutrition-tracker-controller\.js/,
  );
});

test('rejects the converted application composition-root UMD file from the Vite artifact', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'app.js'), '');

  assert.throws(
    () => verifyBuildDirectory(directory),
    /file is outside the build allowlist: app\.js/,
  );
});

test('rejects source entries, legacy runtimes, and manual cache busting in built HTML', (t) => {
  const cases = [
    ['/src/main.jsx', /source Vite entry detected/],
    ['./app.js', /legacy runtime reference detected/],
    ['./assets/baseline-abc123.js?v=1', /manual cache-busting query detected/],
  ];

  for (const [scriptSource, expectedError] of cases) {
    const directory = createValidBuildFixture();
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.writeFileSync(
      path.join(directory, 'index.html'),
      `<script type="module" src="${scriptSource}"></script><link rel="stylesheet" href="./assets/style-abc123.css">`,
    );
    assert.throws(() => verifyBuildDirectory(directory), expectedError);
  }
});

test('rejects non-relative or unhashed generated asset references', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(directory, 'index.html'),
    '<script type="module" src="/assets/baseline.js"></script><link rel="stylesheet" href="/assets/style.css">',
  );

  assert.throws(
    () => verifyBuildDirectory(directory),
    /missing a relative hashed JavaScript asset[\s\S]*missing a relative hashed CSS asset/,
  );
});

test('rejects generated CSS injected after the inline legacy styles', (t) => {
  const directory = createValidBuildFixture();
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(directory, 'index.html'),
    '<style>body{color:black}</style><link rel="stylesheet" href="./assets/style-abc123.css"><script type="module" src="./assets/baseline-abc123.js"></script>',
  );

  assert.throws(
    () => verifyBuildDirectory(directory),
    /generated CSS asset appears after inline styles and changes the legacy cascade/,
  );
});
