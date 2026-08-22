#!/usr/bin/env node
"use strict";

const fs = require("node:fs");

const {
  DEFAULT_PAGE_SIZE,
  LegacyInventoryError,
  MAX_PAGE_SIZE,
} = require("../src/legacy-migration-inventory.js");
const {
  createAdminCopyAdapter,
  executeLegacyCopy,
} = require("../src/legacy-migration-copy.js");
const {
  createFirebaseCliApplicationDefault,
  sanitizedErrorCategory,
} = require("./c23-legacy-dry-run.js");

function usage() {
  return [
    "Usage:",
    "  npm --prefix functions run c23:copy -- --project <project-id> --confirm-project <project-id> --expected-legacy-documents <count> [--page-size 200] [--firebase-cli-session]",
    "",
    "Copies verified legacy values into canonical destinations without modifying or deleting legacy documents.",
    "The complete fail-closed preflight runs before the first write.",
  ].join("\n");
}

function parseArguments(argv) {
  const options = {pageSize: DEFAULT_PAGE_SIZE};
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--project") options.projectId = argv[++index];
    else if (argument === "--confirm-project") options.confirmProject = argv[++index];
    else if (argument === "--expected-legacy-documents") {
      options.expectedLegacyDocuments = Number(argv[++index]);
    } else if (argument === "--page-size") options.pageSize = Number(argv[++index]);
    else if (argument === "--firebase-cli-session") options.firebaseCliSession = true;
    else throw new Error("unknown-argument");
  }
  if (options.help) return options;
  if (!options.projectId || options.confirmProject !== options.projectId) {
    throw new Error("exact-project-confirmation-required");
  }
  if (!Number.isInteger(options.expectedLegacyDocuments) ||
      options.expectedLegacyDocuments < 1) {
    throw new Error("expected-legacy-count-required");
  }
  if (!Number.isInteger(options.pageSize) ||
      options.pageSize < 1 || options.pageSize > MAX_PAGE_SIZE) {
    throw new Error("invalid-page-size");
  }
  return options;
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
    const result = await executeLegacyCopy({
      adapter: createAdminCopyAdapter({
        auth: getAuth(app),
        firestore: getFirestore(app),
        documentIdField: FieldPath.documentId(),
      }),
      expectedLegacyDocuments: options.expectedLegacyDocuments,
      pageSize: options.pageSize,
    });
    process.stdout.write(`${JSON.stringify({
      projectId: options.projectId,
      completedAt: new Date().toISOString(),
      ...result,
    }, null, 2)}\n`);
    return 0;
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
      const category = error instanceof LegacyInventoryError ?
        sanitizedErrorCategory(error) : sanitizedErrorCategory(error);
      process.stderr.write(`C23 copy failed: ${category}\n`);
      process.exitCode = 1;
    },
  );
}

module.exports = {main, parseArguments, usage};
