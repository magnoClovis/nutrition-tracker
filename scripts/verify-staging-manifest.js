'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MANIFEST_PATH = 'config/staging-environment.json';
const STAGING_PROJECT_ID = 'trofia-staging';
const STAGING_PROJECT_NUMBER = '31822846339';
const REQUIRED_FIELDS = Object.freeze([
  'firebase.projectId',
  'firebase.projectNumber',
  'firebase.webAppId',
  'firebase.webApiKey',
  'firebase.authDomain',
  'appCheck.webSiteKey',
  'hosting.origin',
  'worker.name',
  'worker.origin',
  'callable.url',
  'android.applicationId',
  'android.firebaseAppId',
  'functions.requestServiceAccount',
  'functions.processorServiceAccount',
  'functions.reconcilerServiceAccount',
  'functions.schedulerServiceAccount',
  'functions.taskQueueId',
  'functions.schedulerJobId',
]);

function getField(record, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value?.[key], record);
}

function isPopulated(value) {
  return typeof value === 'string'
    && value.trim() === value
    && value.length > 0
    && !/^(todo|tbd|pending|placeholder|changeme)$/i.test(value);
}

function isHttpsOrigin(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:'
      && parsed.origin === value
      && !parsed.username
      && !parsed.password;
  } catch {
    return false;
  }
}

function hasOnlyExpectedFields(manifest) {
  const expected = new Set(['schemaVersion', 'target', ...REQUIRED_FIELDS]);
  function visit(value, prefix = '') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
    return Object.entries(value).every(([key, child]) => {
      const field = prefix ? `${prefix}.${key}` : key;
      if (!expected.has(field) && !REQUIRED_FIELDS.some((required) => required.startsWith(`${field}.`))) return false;
      return visit(child, field);
    });
  }
  return visit(manifest);
}

function inspectStagingManifest(manifest, options = {}) {
  const findings = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['manifest: expected an object'];
  }
  if (manifest.schemaVersion !== 1) findings.push('schemaVersion: unsupported version');
  if (manifest.target !== 'staging') findings.push('target: expected staging');
  if (!hasOnlyExpectedFields(manifest)) findings.push('manifest: unexpected field');

  for (const field of REQUIRED_FIELDS) {
    if (!isPopulated(getField(manifest, field))) findings.push(`${field}: missing or placeholder`);
  }
  if (findings.some((finding) => finding.endsWith('missing or placeholder'))) return findings;

  const projectId = manifest.firebase.projectId;
  const projectNumber = manifest.firebase.projectNumber;
  if (projectId !== STAGING_PROJECT_ID) findings.push('firebase.projectId: unexpected project');
  if (projectNumber !== STAGING_PROJECT_NUMBER) findings.push('firebase.projectNumber: unexpected project');
  if (!new RegExp(`^1:${STAGING_PROJECT_NUMBER}:web:[a-f0-9]+$`, 'i').test(manifest.firebase.webAppId)) {
    findings.push('firebase.webAppId: does not belong to staging project number');
  }
  if (!new RegExp(`^1:${STAGING_PROJECT_NUMBER}:android:[a-f0-9]+$`, 'i').test(manifest.android.firebaseAppId)) {
    findings.push('android.firebaseAppId: does not belong to staging project number');
  }
  if (manifest.firebase.authDomain !== `${STAGING_PROJECT_ID}.firebaseapp.com`) {
    findings.push('firebase.authDomain: unexpected auth domain');
  }
  if (manifest.hosting.origin !== `https://${STAGING_PROJECT_ID}.web.app`) {
    findings.push('hosting.origin: unexpected staging host');
  }
  if (!isHttpsOrigin(manifest.worker.origin)) findings.push('worker.origin: expected an HTTPS origin');
  if (manifest.worker.name === 'trofia-ai-proxy') findings.push('worker.name: production Worker name');
  if (!/^com\.hermegas\.trofia\.[a-z][a-z0-9.]*$/i.test(manifest.android.applicationId)) {
    findings.push('android.applicationId: expected a distinct Trofia staging ID');
  }
  if (manifest.callable.url !== `https://europe-southwest1-${STAGING_PROJECT_ID}.cloudfunctions.net/requestAccountDeletion`) {
    findings.push('callable.url: unexpected project, region, or function');
  }
  for (const field of [
    'functions.requestServiceAccount',
    'functions.processorServiceAccount',
    'functions.reconcilerServiceAccount',
    'functions.schedulerServiceAccount',
  ]) {
    if (!getField(manifest, field).endsWith(`@${STAGING_PROJECT_ID}.iam.gserviceaccount.com`)) {
      findings.push(`${field}: outside staging project`);
    }
  }
  for (const field of ['functions.taskQueueId', 'functions.schedulerJobId']) {
    if (!/^[a-z][a-z0-9-]{2,62}$/.test(getField(manifest, field))) {
      findings.push(`${field}: invalid resource ID`);
    }
  }
  if (!/^AIza[A-Za-z0-9_-]{20,}$/.test(manifest.firebase.webApiKey)) {
    findings.push('firebase.webApiKey: invalid public web API key format');
  }
  if (options.productionWebApiKey === manifest.firebase.webApiKey) {
    findings.push('firebase.webApiKey: production web API key');
  }
  if (!/^[A-Za-z0-9_-]{10,}$/.test(manifest.appCheck.webSiteKey)) {
    findings.push('appCheck.webSiteKey: invalid public site key format');
  }
  if (/nutrition-tracker-780b3|trofia-ai-proxy\.cmagno-dev\.workers\.dev/i.test(JSON.stringify(manifest))) {
    findings.push('manifest: production project or Worker binding');
  }
  return findings;
}

function verifyStagingManifest(projectRoot) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, MANIFEST_PATH), 'utf8'));
  } catch {
    throw new Error('Staging manifest check failed:\n- manifest: missing or invalid JSON');
  }
  const productionConfig = fs.readFileSync(path.join(projectRoot, 'firebase-config-internal.js'), 'utf8');
  const productionWebApiKey = productionConfig.match(/const PRODUCTION_WEB_KEY = "([A-Za-z0-9_-]+)";/)?.[1];
  const findings = inspectStagingManifest(manifest, { productionWebApiKey });
  if (!productionWebApiKey) findings.push('firebase.webApiKey: production comparison unavailable');
  if (findings.length) {
    throw new Error(`Staging manifest check failed:\n- ${findings.join('\n- ')}`);
  }
  return manifest;
}

if (require.main === module) {
  try {
    verifyStagingManifest(path.resolve(__dirname, '..'));
    console.log('Staging manifest check passed. Runtime bindings require separate verification.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  MANIFEST_PATH,
  REQUIRED_FIELDS,
  inspectStagingManifest,
  verifyStagingManifest,
};
