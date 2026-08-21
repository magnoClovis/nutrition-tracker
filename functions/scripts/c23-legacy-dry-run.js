#!/usr/bin/env node
"use strict";

const {
  DEFAULT_PAGE_SIZE,
  LegacyInventoryError,
  MAX_PAGE_SIZE,
  buildLegacyMigrationInventory,
  createAdminReadAdapter,
} = require("../src/legacy-migration-inventory.js");

function usage() {
  return [
    "Usage:",
    "  npm --prefix functions run c23:inventory -- --project <project-id> [--page-size 200]",
    "",
    "Read-only C23 inventory. It never writes or deletes Firestore data.",
    "Authentication uses Application Default Credentials; do not pass tokens on the command line.",
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

  const {getApps, initializeApp} = require("firebase-admin/app");
  const {getAuth} = require("firebase-admin/auth");
  const {FieldPath, getFirestore} = require("firebase-admin/firestore");
  const app = getApps()[0] || initializeApp({projectId: options.projectId});
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

module.exports = {main, parseArguments, sanitizedErrorCategory, usage};
