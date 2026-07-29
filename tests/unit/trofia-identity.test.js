const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function pngDimensions(relativePath) {
  const bytes = fs.readFileSync(path.join(root, relativePath));
  assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG');
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

test('Trofia identity is consistent across Capacitor, Android and Web', () => {
  const capacitor = JSON.parse(read('capacitor.config.json'));
  const manifest = JSON.parse(read('manifest.json'));
  const androidGradle = read('android/app/build.gradle');
  const androidStrings = read('android/app/src/main/res/values/strings.xml');
  const mainActivity = read('android/app/src/main/java/com/hermegas/trofia/MainActivity.java');

  assert.deepEqual(
    { appId: capacitor.appId, appName: capacitor.appName },
    { appId: 'com.hermegas.trofia', appName: 'Trofia' },
  );
  assert.equal(manifest.name, 'Trofia');
  assert.equal(manifest.short_name, 'Trofia');
  assert.match(androidGradle, /namespace\s*=\s*"com\.hermegas\.trofia"/);
  assert.match(androidGradle, /applicationId "com\.hermegas\.trofia"/);
  assert.match(androidStrings, /<string name="app_name">Trofia<\/string>/);
  assert.match(mainActivity, /^package com\.hermegas\.trofia;/m);
  assert.equal(
    fs.existsSync(path.join(root, 'android/app/src/main/java/com/hermegas/phrona/MainActivity.java')),
    false,
  );
});

test('Web identity uses only the regenerated Trofia icons', () => {
  const manifest = JSON.parse(read('manifest.json'));
  const index = read('index.html');
  const expected = [
    ['trofia-icon-192.png', 192, 192],
    ['trofia-icon-512.png', 512, 512],
    ['trofia-favicon-32.png', 32, 32],
    ['trofia-apple-touch-icon.png', 180, 180],
  ];

  assert.deepEqual(manifest.icons.map(icon => icon.src), [
    'trofia-icon-192.png',
    'trofia-icon-512.png',
  ]);
  assert.match(index, /<title>Trofia<\/title>/);

  for (const [filename, width, height] of expected) {
    assert.deepEqual(pngDimensions(filename), { width, height });
  }

  for (const filename of [
    'phrona-icon-192.png',
    'phrona-icon-512.png',
    'phrona-favicon-32.png',
    'phrona-apple-touch-icon.png',
  ]) {
    assert.equal(fs.existsSync(path.join(root, filename)), false);
  }
});
