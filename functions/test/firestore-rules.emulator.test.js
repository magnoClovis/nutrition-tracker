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
  serverTimestamp,
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
  const waterRef = doc(ownerDb, "nutrition", uid, "days", "2026-08-29", "water", "water-1");
  const migrationRef = doc(
    ownerDb, "nutrition", uid, "days", "2026-08-29", "migrations", "water",
  );
  const legacyRef = doc(ownerDb, "nutrition", `${uid}_pantry`);
  const lockRef = doc(ownerDb, "accountDeletionLocks", uid);
  const jobRef = doc(ownerDb, "accountDeletionJobs", "request_rules_123456789");

  await assertSucceeds(setDoc(userRef, {profile: true}));
  await assertSucceeds(setDoc(dataRef, {value: "before-lock"}));
  await assertSucceeds(setDoc(waterRef, {
    schemaVersion: 1,
    id: "water-1",
    date: "2026-08-29",
    entry: {id: "water-1", ml: 250},
    updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(setDoc(migrationRef, {
    schemaVersion: 1,
    kind: "water",
    date: "2026-08-29",
    complete: true,
    updatedAt: serverTimestamp(),
  }));
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
  await assertFails(setDoc(waterRef, {
    schemaVersion: 1,
    id: "water-1",
    date: "2026-08-29",
    entry: {id: "water-1", ml: 500},
    updatedAt: serverTimestamp(),
  }));
  await assertFails(deleteDoc(waterRef));
  await assertFails(setDoc(migrationRef, {
    schemaVersion: 1,
    kind: "water",
    date: "2026-08-29",
    complete: true,
    updatedAt: serverTimestamp(),
  }));
  await assertFails(deleteDoc(userRef));
  await assertFails(deleteDoc(legacyRef));
  await assertSucceeds(getDoc(userRef));
  await assertSucceeds(getDoc(dataRef));
  await assertSucceeds(getDoc(waterRef));
  await assertFails(getDoc(legacyRef));
});

test("legacy documents are inaccessible and immutable to every client", {
  skip: !RUN_EMULATOR_TESTS,
}, async (context) => {
  const environment = await createEnvironment();
  context.after(() => environment.cleanup());
  await environment.clearFirestore();

  const uid = "legacy-rules-owner";
  const ownerDb = environment.authenticatedContext(uid).firestore();
  const otherDb = environment.authenticatedContext("legacy-rules-other").firestore();
  const ownerLegacyRef = doc(ownerDb, "nutrition", `${uid}_pantry`);
  const ownerNewLegacyRef = doc(ownerDb, "nutrition", `${uid}_newKey`);
  const otherLegacyRef = doc(otherDb, "nutrition", `${uid}_pantry`);

  await environment.withSecurityRulesDisabled(async (adminContext) => {
    await setDoc(doc(adminContext.firestore(), "nutrition", `${uid}_pantry`), {
      value: "legacy",
    });
  });

  await assertFails(getDoc(ownerLegacyRef));
  await assertFails(setDoc(ownerLegacyRef, {value: "changed"}, {merge: true}));
  await assertFails(setDoc(ownerNewLegacyRef, {value: "created"}));
  await assertFails(deleteDoc(ownerLegacyRef));

  await assertFails(getDoc(otherLegacyRef));
  await assertFails(setDoc(otherLegacyRef, {value: "changed"}, {merge: true}));
  await assertFails(deleteDoc(otherLegacyRef));

  await environment.withSecurityRulesDisabled(async (adminContext) => {
    const snapshot = await getDoc(
      doc(adminContext.firestore(), "nutrition", `${uid}_pantry`),
    );
    assert.equal(snapshot.exists(), true);
    assert.equal(snapshot.data().value, "legacy");
  });
});

test("canonical schema keeps owner CRUD and rejects every other user", {
  skip: !RUN_EMULATOR_TESTS,
}, async (context) => {
  const environment = await createEnvironment();
  context.after(() => environment.cleanup());
  await environment.clearFirestore();

  const uid = "canonical-rules-owner";
  const ownerDb = environment.authenticatedContext(uid).firestore();
  const otherDb = environment.authenticatedContext("canonical-rules-other").firestore();
  const ownerRoot = doc(ownerDb, "nutrition", uid);
  const ownerData = doc(ownerDb, "nutrition", uid, "data", "today");
  const otherRoot = doc(otherDb, "nutrition", uid);
  const otherData = doc(otherDb, "nutrition", uid, "data", "today");

  await assertSucceeds(setDoc(ownerRoot, {profile: true}));
  await assertSucceeds(setDoc(ownerData, {value: "created"}));
  await assertSucceeds(setDoc(ownerRoot, {profile: false}, {merge: true}));
  await assertSucceeds(setDoc(ownerData, {value: "updated"}, {merge: true}));
  await assertSucceeds(getDoc(ownerRoot));
  await assertSucceeds(getDoc(ownerData));

  await assertFails(getDoc(otherRoot));
  await assertFails(getDoc(otherData));
  await assertFails(setDoc(otherRoot, {profile: "other"}, {merge: true}));
  await assertFails(setDoc(otherData, {value: "other"}, {merge: true}));
  await assertFails(deleteDoc(otherData));
  await assertFails(deleteDoc(otherRoot));

  await assertSucceeds(deleteDoc(ownerData));
  await assertSucceeds(deleteDoc(ownerRoot));
});

test("granular daily schema validates owner, path identity, and exact envelopes", {
  skip: !RUN_EMULATOR_TESTS,
}, async (context) => {
  const environment = await createEnvironment();
  context.after(() => environment.cleanup());
  await environment.clearFirestore();

  const uid = "granular-rules-owner";
  const ownerDb = environment.authenticatedContext(uid).firestore();
  const otherDb = environment.authenticatedContext("granular-rules-other").firestore();
  const mealPath = ["nutrition", uid, "days", "2026-08-29", "meals", "meal-1"];
  const waterPath = ["nutrition", uid, "days", "2026-08-29", "water", "water-1"];
  const supplementPath = [
    "nutrition", uid, "days", "2026-08-29", "supplements", "supplement-1",
  ];
  const mealRef = doc(ownerDb, ...mealPath);
  const waterRef = doc(ownerDb, ...waterPath);
  const supplementRef = doc(ownerDb, ...supplementPath);
  const migrationRef = doc(
    ownerDb, "nutrition", uid, "days", "2026-08-29", "migrations", "meal",
  );

  await assertSucceeds(setDoc(mealRef, {
    schemaVersion: 1,
    id: "meal-1",
    date: "2026-08-29",
    mealKey: "Almoço",
    entry: {id: "meal-1", name: "Arroz", kcal: 130},
    updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(setDoc(waterRef, {
    schemaVersion: 1,
    id: "water-1",
    date: "2026-08-29",
    entry: {id: "water-1", ml: 250},
    updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(setDoc(supplementRef, {
    schemaVersion: 1,
    id: "supplement-1",
    date: "2026-08-29",
    entry: {id: "supplement-1", name: "Creatina", dose: 5},
    updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(getDoc(mealRef));
  await assertSucceeds(setDoc(migrationRef, {
    schemaVersion: 1,
    kind: "meal",
    date: "2026-08-29",
    complete: true,
    updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(getDoc(migrationRef));

  await assertFails(getDoc(doc(otherDb, ...mealPath)));
  await assertFails(setDoc(doc(otherDb, ...waterPath), {
    schemaVersion: 1,
    id: "water-1",
    date: "2026-08-29",
    entry: {id: "water-1", ml: 500},
    updatedAt: serverTimestamp(),
  }));
  await assertFails(getDoc(doc(
    otherDb, "nutrition", uid, "days", "2026-08-29", "migrations", "meal",
  )));
  await assertFails(setDoc(doc(
    ownerDb, "nutrition", uid, "days", "2026-08-29", "migrations", "unknown",
  ), {
    schemaVersion: 1,
    kind: "unknown",
    date: "2026-08-29",
    complete: true,
    updatedAt: serverTimestamp(),
  }));
  await assertFails(setDoc(migrationRef, {
    schemaVersion: 1,
    kind: "meal",
    date: "2026-08-29",
    complete: false,
    updatedAt: serverTimestamp(),
  }));
  await assertFails(deleteDoc(migrationRef));
  await assertFails(setDoc(doc(ownerDb,
    "nutrition", uid, "days", "2026-08-29", "water", "water-2"), {
    schemaVersion: 1,
    id: "different-id",
    date: "2026-08-29",
    entry: {id: "different-id", ml: 250},
    updatedAt: serverTimestamp(),
  }));
  await assertFails(setDoc(doc(ownerDb,
    "nutrition", uid, "days", "2026-08-30", "water", "water-3"), {
    schemaVersion: 1,
    id: "water-3",
    date: "2026-08-29",
    entry: {id: "water-3", ml: 250},
    updatedAt: serverTimestamp(),
  }));
  await assertFails(setDoc(doc(ownerDb,
    "nutrition", uid, "days", "2026-08-29", "meals", "meal-2"), {
    schemaVersion: 1,
    id: "meal-2",
    date: "2026-08-29",
    mealKey: "Almoço",
    entry: {id: "meal-2", name: "Feijão"},
    updatedAt: serverTimestamp(),
    unexpected: true,
  }));
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
  const granularRef = doc(
    ownerDb, "nutrition", uid, "days", "2026-08-29", "meals", "meal-raced",
  );
  const granularLateRef = doc(
    ownerDb, "nutrition", uid, "days", "2026-08-29", "water", "water-late",
  );
  const nestedPath = `nutrition/${uid}/data/raced/details/deep`;

  await setDoc(userRef, {profile: true});
  await setDoc(racedRef, {value: "initial"});
  await setDoc(granularRef, {
    schemaVersion: 1,
    id: "meal-raced",
    date: "2026-08-29",
    mealKey: "Outro",
    entry: {id: "meal-raced", name: "Race"},
    updatedAt: serverTimestamp(),
  });

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
  await assertFails(setDoc(granularLateRef, {
    schemaVersion: 1,
    id: "water-late",
    date: "2026-08-29",
    entry: {id: "water-late", ml: 250},
    updatedAt: serverTimestamp(),
  }));
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
  assert.equal(
    (await adminDb.doc(`nutrition/${uid}/days/2026-08-29/meals/meal-raced`).get()).exists,
    false,
  );

  await operations.sealWriteLock({uid, requestId});
  assert.equal(
    (await adminDb.doc(`accountDeletionLocks/${uid}`).get()).data().state,
    "sealed",
  );
});
