#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {randomUUID} = require("node:crypto");
const {
  buildFirestoreSchemaInventory,
  createAdminSchemaReadAdapter,
  SchemaInventoryError,
} = require("../src/firestore-schema-inventory.js");

function parseArguments(argv) {
  const options = {pageSize: 200};
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--project") options.projectId = argv[++index];
    else if (argument === "--page-size") options.pageSize = Number(argv[++index]);
    else if (argument === "--firebase-cli-session") options.firebaseCliSession = true;
    else throw new Error("unknown-argument");
  }
  if (!options.projectId || !/^[a-z][a-z0-9-]{4,29}$/.test(options.projectId)) {
    throw new Error("explicit-valid-project-required");
  }
  if (!Number.isInteger(options.pageSize) || options.pageSize < 1 || options.pageSize > 1000) {
    throw new Error("invalid-page-size");
  }
  return options;
}

function createFirebaseCliCredential() {
  const firebaseCliAuth = require("firebase-tools/lib/auth.js");
  const {clientId, clientSecret} = require("firebase-tools/lib/api.js");
  const refreshToken = firebaseCliAuth.getGlobalDefaultAccount()?.tokens?.refresh_token;
  if (!refreshToken) throw new SchemaInventoryError("firebase-cli-login-required");
  const credentialPath = path.join(os.tmpdir(), `trofia-c14-adc-${randomUUID()}.json`);
  fs.writeFileSync(credentialPath, JSON.stringify({
    type: "authorized_user",
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: refreshToken,
  }), {encoding: "utf8", flag: "wx", mode: 0o600});
  return credentialPath;
}

function sanitizedError(error) {
  const category = error?.code || error?.message;
  if (Number.isInteger(category)) return `firebase-code-${category}`;
  if (typeof error?.code === "string") {
    const normalized = error.code.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "").slice(0, 60);
    if (/^[a-z][a-z0-9-]{2,60}$/.test(normalized)) return normalized;
  }
  if (typeof error?.name === "string" && error.name !== "Error") {
    const normalizedName = error.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "").slice(0, 60);
    if (/^[a-z][a-z0-9-]{2,60}$/.test(normalizedName)) return normalizedName;
  }
  return /^[a-z][a-z0-9-]{2,60}$/.test(category || "") ? category : "admin-read-failure";
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const {applicationDefault, deleteApp, initializeApp} = require("firebase-admin/app");
  const {getAuth} = require("firebase-admin/auth");
  const {FieldPath, getFirestore} = require("firebase-admin/firestore");
  const previousCredentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let credentialPath;
  let app;
  try {
    if (options.firebaseCliSession) {
      credentialPath = createFirebaseCliCredential();
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath;
    }
    app = initializeApp({
      projectId: options.projectId,
      ...(credentialPath ? {credential: applicationDefault()} : {}),
    }, `c14-schema-${randomUUID()}`);
    const report = await buildFirestoreSchemaInventory({
      reader: createAdminSchemaReadAdapter({
        auth: getAuth(app),
        firestore: getFirestore(app),
        documentIdField: FieldPath.documentId(),
      }),
      pageSize: options.pageSize,
    });
    process.stdout.write(`${JSON.stringify({
      projectId: options.projectId,
      generatedAt: new Date().toISOString(),
      ...report,
    }, null, 2)}\n`);
    return report.complete ? 0 : 2;
  } finally {
    if (app) await deleteApp(app);
    if (credentialPath) {
      fs.rmSync(credentialPath, {force: true});
      if (previousCredentialPath === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      else process.env.GOOGLE_APPLICATION_CREDENTIALS = previousCredentialPath;
    }
  }
}

if (require.main === module) {
  main().then(
    code => { process.exitCode = code; },
    error => {
      process.stderr.write(`C14 schema inventory failed: ${sanitizedError(error)}\n`);
      process.exitCode = 1;
    },
  );
}

module.exports = {main, parseArguments, sanitizedError};
