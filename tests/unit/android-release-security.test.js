const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  verifyManifestText,
  verifyFilePathsText,
  verifyDataExtractionRulesText,
  verifyGoogleServicesConfig,
} = require('../../scripts/verify-android-release-security.js');

const root = path.resolve(__dirname, '..', '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Android release manifest disables backup and cleartext and restricts FileProvider', () => {
  const result = verifyManifestText(read('android/app/src/main/AndroidManifest.xml'));
  assert.equal(result.versionCode, undefined);
  verifyFilePathsText(read('android/app/src/main/res/xml/file_paths.xml'));
  verifyDataExtractionRulesText(read('android/app/src/main/res/xml/data_extraction_rules.xml'));
});

test('Android manifest verifier rejects backup, cleartext, and exported provider regressions', () => {
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  assert.throws(
    () => verifyManifestText(manifest.replace('android:allowBackup="false"', 'android:allowBackup="true"')),
    /Auto Backup must be disabled/,
  );
  assert.throws(
    () => verifyManifestText(manifest.replace('android:usesCleartextTraffic="false"', 'android:usesCleartextTraffic="true"')),
    /Cleartext traffic must be explicitly disabled/,
  );
  assert.throws(
    () => verifyManifestText(manifest.replace('android:exported="false"', 'android:exported="true"')),
    /FileProvider must not be exported/,
  );
});

test('FileProvider verifier rejects broad external or persistent paths', () => {
  assert.throws(
    () => verifyFilePathsText('<paths><external-path name="all" path="." /></paths>'),
    /broad or persistent path/,
  );
  assert.throws(
    () => verifyFilePathsText('<paths><files-path name="files" path="." /></paths>'),
    /broad or persistent path/,
  );
});

test('data extraction verifier requires every account-storage domain in both channels', () => {
  const rules = read('android/app/src/main/res/xml/data_extraction_rules.xml');
  assert.throws(
    () => verifyDataExtractionRulesText(rules.replace('<exclude domain="database" path="." />', '')),
    /cloud-backup does not exclude database/,
  );
  const lastSharedPref = rules.lastIndexOf('<exclude domain="sharedpref" path="." />');
  const incompleteTransfer = `${rules.slice(0, lastSharedPref)}${rules.slice(lastSharedPref).replace('<exclude domain="sharedpref" path="." />', '')}`;
  assert.throws(
    () => verifyDataExtractionRulesText(incompleteTransfer),
    /device-transfer does not exclude sharedpref/,
  );
});

test('Firebase verifier accepts only the production project and Android package', () => {
  const valid = {
    project_info: {
      project_id: 'nutrition-tracker-780b3',
      project_number: '128834310181',
    },
    client: [{
      client_info: {
        mobilesdk_app_id: '1:128834310181:android:test',
        android_client_info: { package_name: 'com.hermegas.trofia' },
      },
      api_key: [{ current_key: 'test-only-value' }],
    }],
  };
  assert.doesNotThrow(() => verifyGoogleServicesConfig(valid));
  assert.throws(
    () => verifyGoogleServicesConfig({ ...valid, project_info: { ...valid.project_info, project_id: 'wrong-project' } }),
    /project_id does not match/,
  );
  const wrongPackage = structuredClone(valid);
  wrongPackage.client[0].client_info.android_client_info.package_name = 'com.example.wrong';
  assert.throws(() => verifyGoogleServicesConfig(wrongPackage), /Android client/);
});

test('Gradle release graph verifies semantic Firebase config, merged manifest, and signed AAB', () => {
  const gradle = read('android/app/build.gradle');
  assert.match(gradle, /new JsonSlurper\(\)\.parse\(googleServicesFile\)/);
  assert.match(gradle, /expectedFirebaseProjectId = "nutrition-tracker-780b3"/);
  assert.match(gradle, /expectedFirebaseProjectNumber = "128834310181"/);
  assert.match(gradle, /expectedAndroidPackage = "com\.hermegas\.trofia"/);
  assert.match(gradle, /tasks\.register\("verifyReleaseSecurityConfig", Exec\)/);
  assert.match(gradle, /dependsOn "processReleaseMainManifest"/);
  assert.match(gradle, /tasks\.register\("verifyReleaseBundleSecurity", Exec\)/);
  assert.match(gradle, /finalizedBy verifyReleaseBundleSecurity/);
  assert.match(gradle, /--expected-version-code/);
  assert.match(gradle, /--expected-version-name/);
  assert.match(gradle, /--aab/);
  const verifier = read('scripts/verify-android-release-security.js');
  assert.match(verifier, /jar verified\\\./i);
  assert.match(verifier, /jar is unsigned/i);
});
