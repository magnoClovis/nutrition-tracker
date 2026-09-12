const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('C3 composes the bounded native preview into the real image-meal flow', () => {
  const app = read('src/App.jsx');
  const controller = read('nutrition-tracker-controller.js');
  assert.match(app, /embeddedCameraPreview:\s*embeddedMealCameraPreview/);
  assert.match(app, /preprocessEmbeddedCapture:[\s\S]*preprocessMealImage/);
  assert.match(controller, /onCameraSurface:[\s\S]*startEmbeddedCamera/);
  assert.match(controller, /onEmbeddedCapture:[\s\S]*captureEmbeddedCamera/);
  assert.match(controller, /onCancelCamera:[\s\S]*cancelEmbeddedCamera/);
  assert.match(app, /addAppStateListener:[\s\S]*androidAppRuntime\.addAppStateListener/);
  assert.match(controller, /!isActive[\s\S]*interruptEmbeddedCamera/);
  assert.match(controller, /imageMealCameraActive:[\s\S]*cancelImageMealCamera/);
});

test('C3 preserves a localized transparent viewport, HTML controls, theme tokens, and reduced motion', () => {
  const css = read('one-ui.css');
  assert.match(css, /html:has\(\[data-camera-native-active="true"\]\)/);
  assert.match(css, /\[data-embedded-camera="true"\][\s\S]*border-radius:\s*26px/);
  assert.match(css, /\[data-camera-corner\][\s\S]*radial-gradient/);
  assert.match(css, /\[data-camera-controls="true"\][\s\S]*backdrop-filter:\s*blur/);
  assert.match(css, /@keyframes embeddedCameraOpen/);
  assert.match(css, /@keyframes embeddedCameraCapture/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\[data-embedded-camera="true"\]\s*\{\s*animation:\s*none/);
  assert.match(css, /\[data-camera-corner\][\s\S]*var\(--surface-block\)/);
  assert.match(css, /\[data-camera-shutter="true"\][\s\S]*var\(--accent-action-fill\)/);
  assert.match(css, /body:has\(\[data-camera-native-active="true"\]\)[\s\S]*overflow:\s*hidden/);
});
