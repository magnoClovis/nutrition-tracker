#!/usr/bin/env node
"use strict";

const {
  DEFAULT_PAGE_SIZE,
  LegacyInventoryError,
  MAX_PAGE_SIZE,
  buildLegacyMigrationInventory,
  createAdminReadAdapter,
} = require("../src/legacy-migration-inventory.js");

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {randomUUID} = require("node:crypto");

function usage() {
  return [
    "Usage:",
    "  npm --prefix functions run c23:inventory -- --project <project-id> [--page-size 200] [--firebase-cli-session]",
    "",
    "Read-only C23 inventory. It never writes or deletes Firestore data.",
    "Authentication uses Application Default Credentials by default.",
    "--firebase-cli-session reuses the local Firebase CLI login in memory; it never prints or persists an access token.",
  ].join("\n");
}

function parseArguments(argv) {
  const options = {pageSize: DEFAULT_PAGE_SIZE};
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument === "--project") {
      options.projectId = argv[++index];
    } else if (argument === "--page-size") {
      options.pageSize = Number(argv[++index]);
    } else if (argument === "--firebase-cli-session") {
      options.firebaseCliSession = true;
    } else {
      throw new Error("unknown-argument");
    }
  }

  if (options.help) return options;
  if (!options.projectId || !/^[a-z][a-z0-9-]{4,29}$/.test(options.projectId)) {
    throw new Error("explicit-valid-project-required");
  }
  if (!Number.isInteger(options.pageSize) ||
      options.pageSize < 1 ||
      options.pageSize > MAX_PAGE_SIZE) {
    throw new Error("invalid-page-size");
  }
  return options;
}

function createFirebaseCliApplicationDefault() {
  const firebaseCliAuth = require("firebase-tools/lib/auth.js");
  const {clientId, clientSecret} = require("firebase-tools/lib/api.js");
  const account = firebaseCliAuth.getGlobalDefaultAccount();
  const refreshToken = account?.tokens?.refresh_token;
  if (!refreshToken) throw new LegacyInventoryError("firebase-cli-login-required");

  const credentialPath = path.join(
    os.tmpdir(),
    `trofia-c23-adc-${randomUUID()}.json`,
  );
  fs.writeFileSync(credentialPath, JSON.stringify({
    type: "authorized_user",
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: refreshToken,
  }), {encoding: "utf8", flag: "wx", mode: 0o600});
  return credentialPath;
}

function sanitizedErrorCategory(error) {
  if (error instanceof LegacyInventoryError &&
      /^[a-z][a-z0-9-]{2,60}$/.test(error.code || "")) {
    return error.code;
  }
  if (/^[a-z][a-z0-9-]{2,60}$/.test(error?.message || "")) {
    return error.message;
  }
  return "admin-read-failure";
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }

  const {applicationDefault, deleteApp, getApps, initializeApp} =
    require("firebase-admin/app");
  const {getAuth} = require("firebase-admin/auth");
  const {FieldPath, getFirestore} = require("firebase-admin/firestore");
  const previousCredentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let temporaryCredentialPath = null;
  let existingApp = null;
  let app = null;
  try {
    if (options.firebaseCliSession) {
      temporaryCredentialPath = createFirebaseCliApplicationDefault();
      process.env.GOOGLE_APPLICATION_CREDENTIALS = temporaryCredentialPath;
    }
    const appOptions = {projectId: options.projectId};
    if (temporaryCredentialPath) appOptions.credential = applicationDefault();
    existingApp = getApps()[0] || null;
    app = existingApp || initializeApp(appOptions);
    const reader = createAdminReadAdapter({
      auth: getAuth(app),
      firestore: getFirestore(app),
      documentIdField: FieldPath.documentId(),
    });
    const report = await buildLegacyMigrationInventory({
      reader,
      pageSize: options.pageSize,
    });

    process.stdout.write(`${JSON.stringify({
      projectId: options.projectId,
      generatedAt: new Date().toISOString(),
      ...report,
    }, null, 2)}\n`);
    return report.complete ? 0 : 2;
  } finally {
    try {
      if (app && !existingApp) await deleteApp(app);
    } finally {
      if (temporaryCredentialPath) {
        fs.rmSync(temporaryCredentialPath, {force: true});
        if (previousCredentialPath === undefined) {
          delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
        } else {
          process.env.GOOGLE_APPLICATION_CREDENTIALS = previousCredentialPath;
        }
      }
    }
  }
}

if (require.main === module) {
  main().then(
    code => { process.exitCode = code; },
    error => {
      process.stderr.write(`C23 inventory failed: ${sanitizedErrorCategory(error)}\n`);
      process.exitCode = 1;
    },
  );
}

module.exports = {
  createFirebaseCliApplicationDefault,
  main,
  parseArguments,
  sanitizedErrorCategory,
  usage,
};
