'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const {
  inspectStagingManifest,
  verifyStagingManifest,
} = require('../../scripts/verify-staging-manifest.js');

function completeManifest() {
  return {
    schemaVersion: 1,
    target: 'staging',
    firebase: {
      projectId: 'trofia-staging',
      projectNumber: '31822846339',
      webAppId: '1:31822846339:web:abcdef012345',
      webApiKey: 'AIza0123456789012345678901234567890',
      authDomain: 'trofia-staging.firebaseapp.com',
    },
    appCheck: { webSiteKey: 'stagingSiteKey012345' },
    hosting: { origin: 'https://trofia-staging.web.app' },
    worker: {
      name: 'trofia-ai-proxy-staging',
      origin: 'https://trofia-ai-proxy-staging.cmagno-dev.workers.dev',
    },
    callable: {
      url: 'https://europe-southwest1-trofia-staging.cloudfunctions.net/requestAccountDeletion',
    },
    android: {
      applicationId: 'com.hermegas.trofia.staging',
      firebaseAppId: '1:31822846339:android:abcdef012345',
    },
    functions: {
      requestServiceAccount: 'trofia-del-request@trofia-staging.iam.gserviceaccount.com',
      processorServiceAccount: 'trofia-del-process@trofia-staging.iam.gserviceaccount.com',
      reconcilerServiceAccount: 'trofia-del-reconcile@trofia-staging.iam.gserviceaccount.com',
      schedulerServiceAccount: 'trofia-scheduler-oidc@trofia-staging.iam.gserviceaccount.com',
      taskQueueId: 'account-deletion-staging',
      schedulerJobId: 'account-deletion-reconcile-staging',
    },
  };
}

test('accepts a complete, internally consistent staging manifest', () => {
  assert.deepEqual(inspectStagingManifest(completeManifest()), []);
});

test('rejects the checked-in incomplete manifest without printing field values', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  assert.throws(() => verifyStagingManifest(projectRoot), (error) => {
    assert.match(error.message, /worker.name: missing or placeholder/);
    assert.match(error.message, /worker.origin: missing or placeholder/);
    assert.doesNotMatch(error.message, /production comparison unavailable/);
    assert.doesNotMatch(error.message, /AIza/);
    return true;
  });
});

test('checks populated staging identities even while the manifest is incomplete', () => {
  const manifest = completeManifest();
  manifest.appCheck.webSiteKey = '';
  manifest.firebase.webAppId = '1:123456789:web:abcdef012345';
  manifest.firebase.webApiKey = 'AIzaProductionExample012345678901234';
  const findings = inspectStagingManifest(manifest, {
    productionWebApiKey: manifest.firebase.webApiKey,
  });
  assert.ok(findings.includes('appCheck.webSiteKey: missing or placeholder'));
  assert.ok(findings.includes('firebase.webAppId: does not belong to staging project number'));
  assert.ok(findings.includes('firebase.webApiKey: production web API key'));
  assert.doesNotMatch(findings.join('\n'), /AIza/);
});

test('rejects production project, Worker, and Android identities even when other fields are valid', () => {
  const manifest = completeManifest();
  manifest.firebase.projectId = 'nutrition-tracker-780b3';
  manifest.worker.origin = 'https://trofia-ai-proxy.cmagno-dev.workers.dev';
  manifest.android.applicationId = 'com.hermegas.trofia';
  const findings = inspectStagingManifest(manifest);
  assert.ok(findings.includes('firebase.projectId: unexpected project'));
  assert.ok(findings.includes('android.applicationId: expected a distinct Trofia staging ID'));
  assert.ok(findings.includes('manifest: production project or Worker binding'));
  assert.ok(findings.every((finding) => !finding.includes('AIza')));
});

test('rejects mixed app IDs, callable project, service account, and non-HTTPS origin', () => {
  const manifest = completeManifest();
  manifest.firebase.webAppId = '1:123456789:web:abcdef012345';
  manifest.android.firebaseAppId = '1:123456789:android:abcdef012345';
  manifest.callable.url = 'https://europe-southwest1-other.cloudfunctions.net/requestAccountDeletion';
  manifest.functions.processorServiceAccount = 'trofia-del-process@other.iam.gserviceaccount.com';
  manifest.worker.origin = 'http://trofia-ai-proxy-staging.example.com';
  const findings = inspectStagingManifest(manifest);
  assert.ok(findings.includes('firebase.webAppId: does not belong to staging project number'));
  assert.ok(findings.includes('android.firebaseAppId: does not belong to staging project number'));
  assert.ok(findings.includes('callable.url: unexpected project, region, or function'));
  assert.ok(findings.includes('functions.processorServiceAccount: outside staging project'));
  assert.ok(findings.includes('worker.origin: expected an HTTPS origin'));
});

test('rejects production web API key and unexpected manifest fields without echoing values', () => {
  const manifest = completeManifest();
  manifest.firebase.webApiKey = 'AIzaProductionExample012345678901234';
  manifest.unexpectedSecret = 'must-not-appear-in-diagnostics';
  const findings = inspectStagingManifest(manifest, {
    productionWebApiKey: manifest.firebase.webApiKey,
  });
  assert.ok(findings.includes('firebase.webApiKey: production web API key'));
  assert.ok(findings.includes('manifest: unexpected field'));
  assert.doesNotMatch(findings.join('\n'), /must-not-appear|AIza/);
});

test('rejects missing fields and malformed manifest roots without throwing low-level errors', () => {
  const manifest = completeManifest();
  delete manifest.functions;
  assert.ok(inspectStagingManifest(manifest).includes('functions.taskQueueId: missing or placeholder'));
  assert.deepEqual(inspectStagingManifest(null), ['manifest: expected an object']);
});
