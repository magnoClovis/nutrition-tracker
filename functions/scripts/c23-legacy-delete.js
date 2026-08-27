#!/usr/bin/env node
"use strict";

const fs = require("node:fs");

const {
  DEFAULT_PAGE_SIZE,
  LegacyInventoryError,
  MAX_PAGE_SIZE,
} = require("../src/legacy-migration-inventory.js");
const {
  createAdminDeletionAdapter,
  executeLegacyDeletion,
} = require("../src/legacy-migration-delete.js");
const {
  createFirebaseCliApplicationDefault,
  sanitizedErrorCategory,
} = require("./c23-legacy-dry-run.js");

const DELETE_CONFIRMATION = "DELETE_VERIFIED_LEGACY_DOCUMENTS";

function usage() {
  return [
    "Usage:",
    "  npm --prefix functions run c23:delete -- --project <project-id> --confirm-project <project-id> --expected-legacy-documents <count> --confirmed-export-uri <gs://bucket/prefix> --confirm-delete DELETE_VERIFIED_LEGACY_DOCUMENTS [--page-size 200] [--firebase-cli-session]",
    "",
    "Atomically deletes only legacy sources whose canonical destinations are reverified.",
    "The managed export manifest must exist before the Firestore transaction starts.",
  ].join("\n");
}

function parseManagedExportUri(value) {
  const match = /^gs:\/\/([a-z0-9][a-z0-9._-]{1,221}[a-z0-9])\/(.+)$/.exec(value || "");
  if (!match || match[2].includes("..") || match[2].endsWith("/")) {
    throw new Error("valid-managed-export-uri-required");
  }
  return {bucket: match[1], prefix: match[2]};
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
    } else if (argument === "--confirmed-export-uri") {
      options.confirmedExportUri = argv[++index];
    } else if (argument === "--confirm-delete") {
      options.confirmDelete = argv[++index];
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
  parseManagedExportUri(options.confirmedExportUri);
  if (options.confirmDelete !== DELETE_CONFIRMATION) {
    throw new Error("exact-delete-confirmation-required");
  }
  return options;
}

async function verifyManagedExport(storage, exportUri) {
  const {bucket, prefix} = parseManagedExportUri(exportUri);
  const [files] = await storage.bucket(bucket).getFiles({prefix: `${prefix}/`});
  if (!files.some(file => file.name.endsWith(".overall_export_metadata"))) {
    throw new LegacyInventoryError("managed-export-manifest-not-found");
  }
  return {bucket, prefix, objectCount: files.length};
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
  const {getStorage} = require("firebase-admin/storage");
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

    const exportEvidence = await verifyManagedExport(
      getStorage(app),
      options.confirmedExportUri,
    );
    const result = await executeLegacyDeletion({
      adapter: createAdminDeletionAdapter({
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
      exportVerified: true,
      exportObjectCount: exportEvidence.objectCount,
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
      process.stderr.write(`C23 delete failed: ${sanitizedErrorCategory(error)}\n`);
      process.exitCode = 1;
    },
  );
}

module.exports = {
  DELETE_CONFIRMATION,
  main,
  parseArguments,
  parseManagedExportUri,
  usage,
  verifyManagedExport,
};
