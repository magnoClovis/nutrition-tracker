const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Android versionName mirrors package.json and versionCode advances to 2', () => {
  const packageJson = JSON.parse(read('package.json'));
  const gradle = read('android/app/build.gradle');
  const versionName = gradle.match(/^\s*versionName\s+"([^"]+)"/m)?.[1];
  const versionCode = Number(gradle.match(/^\s*versionCode\s+(\d+)/m)?.[1]);

  assert.equal(versionName, packageJson.version);
  assert.equal(versionCode, 2);
});

test('release signing reads four local properties without affecting debug configuration', () => {
  const gradle = read('android/app/build.gradle');

  assert.match(gradle, /rootProject\.file\("keystore\.properties"\)/);
  for (const property of ['storeFile', 'storePassword', 'keyAlias', 'keyPassword']) {
    assert.match(gradle, new RegExp(`keystoreProperties\\.getProperty\\("${property}"\\)`));
  }
  assert.match(gradle, /signingConfig signingConfigs\.release/);
  assert.match(gradle, /gradle\.taskGraph\.whenReady/);
  assert.match(
    gradle,
    /if \(releaseSigningError != null\) \{\s*throw new GradleException\("Trofia release signing is not configured/,
  );
  assert.doesNotMatch(gradle, /buildTypes\s*\{[\s\S]*?debug\s*\{[\s\S]*?signingConfig/);
});

test('release bundles fail closed without Firebase variables or freshly synced Vite assets', () => {
  const gradle = read('android/app/build.gradle');

  assert.match(gradle, /VITE_FIREBASE_WEB_APP_ID/);
  assert.match(gradle, /VITE_RECAPTCHA_ENTERPRISE_SITE_KEY/);
  assert.match(gradle, /missingReleaseEnvironment/);
  assert.match(gradle, /releaseWebBundles/);
  assert.match(gradle, /staleReleaseEnvironment/);
  assert.match(gradle, /Rebuild Vite and sync Capacitor first/);
});

test('release bundles fail closed when a worktree lacks google-services.json', () => {
  const gradle = read('android/app/build.gradle');

  assert.match(gradle, /googleServicesFile = file\("google-services\.json"\)/);
  assert.match(gradle, /!googleServicesFile\.isFile\(\)/);
  assert.match(gradle, /android\/app\/google-services\.json/);
  assert.match(gradle, /release artifacts without it are forbidden/);
  assert.match(gradle, /releaseArtifactRequested/);
  assert.ok(
    gradle.indexOf('googleServicesFile = file("google-services.json")') <
      gradle.indexOf('Trofia release signing is not configured'),
    'missing Firebase configuration must fail before unrelated signing setup',
  );
});

test('local signing files are ignored and the committed example is placeholder-only', () => {
  const androidGitignore = read('android/.gitignore');
  const example = read('android/keystore.properties.example');

  assert.match(androidGitignore, /^keystore\.properties$/m);
  assert.match(androidGitignore, /^\*\.jks$/m);
  assert.match(androidGitignore, /^\*\.keystore$/m);
  assert.deepEqual(
    [...example.matchAll(/^(storeFile|storePassword|keyAlias|keyPassword)=(.+)$/gm)]
      .map(([, key]) => key),
    ['storeFile', 'storePassword', 'keyAlias', 'keyPassword'],
  );
  assert.match(example, /CAMINHO\/SEGURO/);
  assert.match(example, /SUBSTITUA_PELA_SENHA_DO_KEYSTORE/);
  assert.match(example, /SUBSTITUA_PELO_ALIAS/);
  assert.match(example, /SUBSTITUA_PELA_SENHA_DA_CHAVE/);
  assert.equal(fs.existsSync(path.join(root, 'android/keystore.properties')), false);
});
