const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const read = relativePath => readFileSync(path.join(__dirname, "..", "..", relativePath), "utf8");

test("safe-area aliases prefer Capacitor SystemBars variables with env fallbacks", () => {
  const css = read("one-ui.css");

  for (const edge of ["top", "right", "bottom", "left"]) {
    assert.match(
      css,
      new RegExp(
        `--app-safe-${edge}: var\\(--safe-area-inset-${edge}, env\\(safe-area-inset-${edge}, 0px\\)\\)`
      )
    );
  }

  assert.match(css, /\[data-app-header\][\s\S]*var\(--app-safe-top\)/);
  assert.match(css, /\[data-app-nav\][\s\S]*var\(--app-safe-bottom\)/);
  assert.match(css, /\[data-safe-area-screen="true"\]/);
  assert.match(css, /\[data-safe-area-dialog\]/);
  assert.match(css, /\[data-safe-area-sheet="true"\]/);
});

test("viewport lets the themed WebView continue behind Android system bars", () => {
  const index = read("index.html");

  assert.match(
    index,
    /<meta name="viewport" content="[^"]*\bviewport-fit=cover\b[^"]*"\/>/,
  );
});

test("shell and overlays consume only the unified aliases", () => {
  const migratedSources = [
    "index.html",
    "nutrition-tracker-controller.js",
    "metrics-screen.js",
    "settings-panel.js"
  ].map(read).join("\n");

  assert.doesNotMatch(migratedSources, /env\(safe-area-inset-/);

  const markerSources = [
    "add-screen.js",
    "backup-modal.js",
    "login-screen.js",
    "meal-review-modal.js",
    "privacy-panel.js",
    "release-notice.js",
    "required-profile-modal.js",
    "settings-panel.js",
    "visual-update-notice.js"
  ].map(read).join("\n");

  assert.match(markerSources, /data-safe-area-screen/);
  assert.match(markerSources, /data-safe-area-screen-header/);
  assert.match(markerSources, /data-safe-area-dialog/);
  assert.match(markerSources, /data-safe-area-sheet/);
  assert.match(markerSources, /data-safe-area-toast/);
});

test("scanner styling and keyboard configuration remain outside this change", () => {
  const scannerCss = read("src/native-barcode-scanner.css");
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  const packageJson = JSON.parse(read("package.json"));

  assert.match(scannerCss, /env\(safe-area-inset-bottom, 0px\)/);
  assert.doesNotMatch(scannerCss, /--app-safe-/);
  assert.doesNotMatch(manifest, /windowSoftInputMode/);
  assert.equal(packageJson.dependencies?.["@capacitor/keyboard"], undefined);
});
