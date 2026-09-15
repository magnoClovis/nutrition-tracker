const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  EXPECTED_VERSION,
  applyPatch,
  patchCameraActivity,
  patchCameraPreview,
} = require('../../scripts/patch-camera-preview-android.js');

const pluginRoot = path.join(__dirname, '..', '..', 'node_modules', '@capacitor-community', 'camera-preview');
const javaRoot = path.join(pluginRoot, 'android', 'src', 'main', 'java', 'com', 'ahm', 'capacitor', 'camera', 'preview');

test('installed Android camera preview contains the fail-closed lifecycle patch', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'package.json'), 'utf8'));
  assert.equal(manifest.version, EXPECTED_VERSION);

  const preview = fs.readFileSync(path.join(javaRoot, 'CameraPreview.java'), 'utf8');
  const activity = fs.readFileSync(path.join(javaRoot, 'CameraActivity.java'), 'utf8');
  assert.match(preview, /commitAllowingStateLoss\(\)/);
  assert.doesNotMatch(preview, /fragmentTransaction\.commit\(\);\s+fragment = null/);
  assert.match(activity, /cameraOperationLock/);
  assert.match(activity, /Camera capture interrupted during teardown/);
  assert.match(activity, /if \(!captureCancelled && mCamera != null\)/);

  assert.equal(patchCameraPreview(preview), preview);
  assert.equal(patchCameraActivity(activity), activity);
});

test('native patch refuses an unreviewed camera-preview version', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'trofia-camera-preview-patch-'));
  try {
    fs.writeFileSync(path.join(temporaryRoot, 'package.json'), JSON.stringify({ version: '9.0.0' }));
    assert.throws(() => applyPatch(temporaryRoot), /supports 8\.0\.1, found 9\.0\.0/);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
