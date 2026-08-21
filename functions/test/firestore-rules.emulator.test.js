"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const {deleteApp, initializeApp} = require("firebase-admin/app");
const {
  FieldPath,
  getFirestore: getAdminFirestore,
} = require("firebase-admin/firestore");
const {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
} = require("firebase/firestore");

const {
  createFirestoreAccountDeletionOperations,
} = require("../src/firestore-account-deletion.js");

const PROJECT_ID = "demo-trofia-c22";
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "";
const RUN_EMULATOR_TESTS = /^[^:]+:\d+$/.test(EMULATOR_HOST);
const RULES = fs.readFileSync(
  path.resolve(__dirname, "..", "..", "firestore.rules"),
  "utf8",
);

async function createEnvironment() {
  const [host, portText] = EMULATOR_HOST.split(":");
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host,
      port: Number(portText),
      rules: RULES,
    },
  });
}

test("write lock blocks owner mutations while preserving reads", {
  skip: !RUN_EMULATOR_TESTS,
}, async (context) => {
  const environment = await createEnvironment();
  context.after(() => environment.cleanup());
  await environment.clearFirestore();

  const uid = "rules-owner";
  const ownerDb = environment.authenticatedContext(uid).firestore();
  const userRef = doc(ownerDb, "nutrition", uid);
  const dataRef = doc(ownerDb, "nutrition", uid, "data", "today");
  const legacyRef = doc(ownerDb, "nutrition", `${uid}_pantry`);
  const lockRef = doc(ownerDb, "accountDeletionLocks", uid);
  const jobRef = doc(ownerDb, "accountDeletionJobs", "request_rules_123456789");

  await assertSucceeds(setDoc(userRef, {profile: true}));
  await assertSucceeds(setDoc(dataRef, {value: "before-lock"}));
  await assertSucceeds(getDoc(userRef));
  await assertFails(getDoc(lockRef));
  await assertFails(getDoc(jobRef));
  await assertFails(setDoc(jobRef, {status: "queued"}));

  await environment.withSecurityRulesDisabled(async (adminContext) => {
    await setDoc(doc(adminContext.firestore(), "accountDeletionLocks", uid), {
      requestId: "request_0123456789abcdef",
      state: "active",
    });
    await setDoc(doc(adminContext.firestore(), "nutrition", `${uid}_pantry`), {
      value: "legacy",
    });
  });

  await assertFails(setDoc(userRef, {profile: false}, {merge: true}));
  await assertFails(setDoc(dataRef, {value: "after-lock"}));
  await assertFails(deleteDoc(userRef));
  await assertFails(deleteDoc(legacyRef));
  await assertSucceeds(getDoc(userRef));
});

test("a racing write cannot survive recursive deletion after lock commit", {
  skip: !RUN_EMULATOR_TESTS,
}, async (context) => {
  const environment = await createEnvironment();
  context.after(() => environment.cleanup());
  await environment.clearFirestore();

  const uid = "concurrent-owner";
  const requestId = "request_concurrent_123456";
  const ownerDb = environment.authenticatedContext(uid).firestore();
  const userRef = doc(ownerDb, "nutrition", uid);
  const racedRef = doc(ownerDb, "nutrition", uid, "data", "raced");
  const lateRef = doc(ownerDb, "nutrition", uid, "data", "late");
  const nestedPath = `nutrition/${uid}/data/raced/details/deep`;

  await setDoc(userRef, {profile: true});
  await setDoc(racedRef, {value: "initial"});

  const adminApp = initializeApp({projectId: PROJECT_ID}, `c22-${Date.now()}`);
  context.after(() => deleteApp(adminApp));
  const adminDb = getAdminFirestore(adminApp);
  const operations = createFirestoreAccountDeletionOperations({
    firestore: adminDb,
    documentIdField: FieldPath.documentId(),
  });
  await adminDb.doc(nestedPath).set({value: "nested"});

  const raceResults = await Promise.allSettled([
    setDoc(racedRef, {value: "racing"}, {merge: true}),
    operations.acquireWriteLock({uid, requestId}),
  ]);
  assert.equal(raceResults[1].status, "fulfilled");

  await assertFails(setDoc(lateRef, {value: "too-late"}));
  await operations.deleteFirestoreData({uid, requestId});
  assert.equal(
    await operations.verifyFirestoreEmpty({uid, requestId}),
    true,
  );

  assert.equal((await adminDb.doc(`nutrition/${uid}`).get()).exists, false);
  assert.equal(
    (await adminDb.doc(`nutrition/${uid}/data/raced`).get()).exists,
    false,
  );
  assert.equal(
    (await adminDb.doc(`nutrition/${uid}/data/late`).get()).exists,
    false,
  );
  assert.equal((await adminDb.doc(nestedPath).get()).exists, false);

  await operations.sealWriteLock({uid, requestId});
  assert.equal(
    (await adminDb.doc(`accountDeletionLocks/${uid}`).get()).data().state,
    "sealed",
  );
});
