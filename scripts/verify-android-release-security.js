const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const EXPECTED_PACKAGE = 'com.hermegas.trofia';
const EXPECTED_PROJECT_ID = 'nutrition-tracker-780b3';
const EXPECTED_PROJECT_NUMBER = '128834310181';
const EXTRACTION_DOMAINS = [
  'root',
  'file',
  'database',
  'sharedpref',
  'external',
  'device_root',
  'device_file',
  'device_database',
  'device_sharedpref',
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function readRequired(filePath, label) {
  invariant(filePath && fs.existsSync(filePath), `${label} not found`);
  const content = fs.readFileSync(filePath, 'utf8');
  invariant(content.trim(), `${label} is empty`);
  return content;
}

function readAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

function verifyManifestText(xml, { requireVersion = false } = {}) {
  const application = xml.match(/<application\b[^>]*>/)?.[0];
  invariant(application, 'Android application element is missing');
  invariant(readAttribute(application, 'android:allowBackup') === 'false', 'Android Auto Backup must be disabled');
  invariant(readAttribute(application, 'android:fullBackupContent') === 'false', 'Legacy full backup must be disabled');
  invariant(
    readAttribute(application, 'android:dataExtractionRules') === '@xml/data_extraction_rules',
    'Android data extraction rules must be explicit',
  );
  invariant(
    readAttribute(application, 'android:usesCleartextTraffic') === 'false',
    'Cleartext traffic must be explicitly disabled',
  );

  const provider = [...xml.matchAll(/<provider\b[^>]*>[\s\S]*?<\/provider>/g)]
    .map(match => match[0])
    .find(block => block.includes('androidx.core.content.FileProvider'));
  invariant(provider, 'Restricted FileProvider is missing');
  const providerTag = provider.match(/<provider\b[^>]*>/)?.[0] || '';
  invariant(readAttribute(providerTag, 'android:exported') === 'false', 'FileProvider must not be exported');
  invariant(readAttribute(providerTag, 'android:grantUriPermissions') === 'true', 'FileProvider URI grants must be explicit');
  invariant(
    ['${applicationId}.fileprovider', `${EXPECTED_PACKAGE}.fileprovider`]
      .includes(readAttribute(providerTag, 'android:authorities')),
    'FileProvider authority must be scoped to the application ID',
  );
  invariant(
    provider.includes('android:resource="@xml/file_paths"'),
    'FileProvider must use the reviewed file_paths resource',
  );

  if (requireVersion) {
    const manifest = xml.match(/<manifest\b[^>]*>/)?.[0] || '';
    invariant(readAttribute(manifest, 'android:versionCode'), 'Merged manifest versionCode is missing');
    invariant(readAttribute(manifest, 'android:versionName'), 'Merged manifest versionName is missing');
  }

  return {
    versionCode: readAttribute(xml.match(/<manifest\b[^>]*>/)?.[0] || '', 'android:versionCode'),
    versionName: readAttribute(xml.match(/<manifest\b[^>]*>/)?.[0] || '', 'android:versionName'),
  };
}

function verifyFilePathsText(xml) {
  invariant(!/<(?:root|external|files|external-files|external-cache|external-media)-path\b/.test(xml), 'FileProvider exposes a broad or persistent path');
  const cachePaths = [...xml.matchAll(/<cache-path\b[^>]*\/>/g)].map(match => match[0]);
  invariant(cachePaths.length === 1, 'FileProvider must expose exactly one cache path');
  invariant(readAttribute(cachePaths[0], 'path') === '.', 'FileProvider cache path must remain app-private');
}

function verifyDataExtractionRulesText(xml) {
  for (const sectionName of ['cloud-backup', 'device-transfer']) {
    const section = xml.match(new RegExp(`<${sectionName}>[\\s\\S]*?<\\/${sectionName}>`))?.[0];
    invariant(section, `${sectionName} rules are missing`);
    for (const domain of EXTRACTION_DOMAINS) {
      invariant(
        section.includes(`<exclude domain="${domain}" path="." />`),
        `${sectionName} does not exclude ${domain}`,
      );
    }
  }
}

function verifyGoogleServicesConfig(config) {
  invariant(config?.project_info?.project_id === EXPECTED_PROJECT_ID, 'Firebase project_id does not match Trofia production');
  invariant(String(config?.project_info?.project_number || '') === EXPECTED_PROJECT_NUMBER, 'Firebase project_number does not match Trofia production');
  const client = (config?.client || []).find(candidate => (
    candidate?.client_info?.android_client_info?.package_name === EXPECTED_PACKAGE
  ));
  invariant(client, 'Firebase Android client for com.hermegas.trofia is missing');
  invariant(client?.client_info?.mobilesdk_app_id, 'Firebase Android mobilesdk_app_id is missing');
  invariant(
    Array.isArray(client?.api_key) && client.api_key.some(entry => entry?.current_key),
    'Firebase Android API key entry is missing',
  );
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex').toUpperCase();
}

function resolveJarsigner() {
  const executable = process.platform === 'win32' ? 'jarsigner.exe' : 'jarsigner';
  if (process.env.JAVA_HOME) {
    const candidate = path.join(process.env.JAVA_HOME, 'bin', executable);
    if (fs.existsSync(candidate)) return candidate;
  }
  return executable;
}

function verifyAabSignature(aabPath) {
  invariant(fs.existsSync(aabPath), 'Release AAB not found');
  const result = spawnSync(resolveJarsigner(), ['-verify', aabPath], {
    encoding: 'utf8',
    windowsHide: true,
  });
  invariant(!result.error, 'Could not execute jarsigner');
  invariant(result.status === 0, 'Release AAB signature verification failed');
  const verificationOutput = `${result.stdout || ''}\n${result.stderr || ''}`;
  invariant(/jar verified\./i.test(verificationOutput), 'Release AAB is not cryptographically signed');
  invariant(!/jar is unsigned/i.test(verificationOutput), 'Release AAB is unsigned');
  return sha256File(aabPath);
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    invariant(key?.startsWith('--') && value, `Invalid argument: ${key || '(empty)'}`);
    options[key.slice(2)] = value;
  }
  return options;
}

function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const root = path.resolve(__dirname, '..');
  const manifestPath = options.manifest || path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  const pathsPath = options.paths || path.join(root, 'android', 'app', 'src', 'main', 'res', 'xml', 'file_paths.xml');
  const extractionPath = options['data-extraction-rules'] || path.join(root, 'android', 'app', 'src', 'main', 'res', 'xml', 'data_extraction_rules.xml');

  verifyManifestText(readRequired(manifestPath, 'AndroidManifest.xml'));
  verifyFilePathsText(readRequired(pathsPath, 'file_paths.xml'));
  verifyDataExtractionRulesText(readRequired(extractionPath, 'data_extraction_rules.xml'));

  if (options['google-services']) {
    let config;
    try {
      config = JSON.parse(readRequired(options['google-services'], 'google-services.json'));
    } catch (error) {
      throw new Error(`google-services.json is invalid JSON: ${error.message}`);
    }
    verifyGoogleServicesConfig(config);
  }

  let mergedVersion;
  if (options['merged-manifest']) {
    mergedVersion = verifyManifestText(
      readRequired(options['merged-manifest'], 'merged release manifest'),
      { requireVersion: true },
    );
    if (options['expected-version-code']) {
      invariant(mergedVersion.versionCode === options['expected-version-code'], 'Merged manifest versionCode differs from the requested release');
    }
    if (options['expected-version-name']) {
      invariant(mergedVersion.versionName === options['expected-version-name'], 'Merged manifest versionName differs from the requested release');
    }
  }

  let aabSha256;
  if (options.aab) aabSha256 = verifyAabSignature(options.aab);

  console.log('Android release security verification passed.');
  if (mergedVersion) console.log(`Version: ${mergedVersion.versionName} (${mergedVersion.versionCode})`);
  if (aabSha256) console.log(`AAB SHA-256: ${aabSha256}`);
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error(`Android release security verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  verifyManifestText,
  verifyFilePathsText,
  verifyDataExtractionRulesText,
  verifyGoogleServicesConfig,
  verifyAabSignature,
  run,
};
