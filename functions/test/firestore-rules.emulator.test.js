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
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
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

function scoreComponentFixture() {
  return {
    key: "protein", type: "target", available: true, applicable: true,
    required: true, weight: 1, target: 100, consumedBefore: 20,
    mealAmount: 30, consumedAfter: 50, remainingBefore: 80,
    remainingAfter: 50, quota: 25, ratio: 1.2,
    candidateKnownCount: 1, candidateItemCount: 1, candidateComplete: true,
    consumedKnownCount: 1, consumedItemCount: 1, consumedComplete: true,
    score: 4,
  };
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
  const dataRef = doc(ownerDb, "nutrition", uid, "data", "notes_2026-08-29");
  const waterRef = doc(ownerDb, "nutrition", uid, "days", "2026-08-29", "water", "water-1");
  const migrationRef = doc(
    ownerDb, "nutrition", uid, "days", "2026-08-29", "migrations", "water",
  );
  const legacyRef = doc(ownerDb, "nutrition", `${uid}_pantry`);
  const lockRef = doc(ownerDb, "accountDeletionLocks", uid);
  const jobRef = doc(ownerDb, "accountDeletionJobs", "request_rules_123456789");

  await assertSucceeds(setDoc(userRef, {userName: "Owner"}));
  await assertSucceeds(setDoc(dataRef, {value: "before-lock"}));
  await assertSucceeds(setDoc(waterRef, {
    schemaVersion: 1,
    id: "water-1",
    date: "2026-08-29",
    entry: {id: "water-1", ml: 250, time: "09:00"},
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

  await assertFails(setDoc(userRef, {userName: "Changed"}, {merge: true}));
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

test("canonical schema keeps owner writes but reserves root deletion for C22", {
  skip: !RUN_EMULATOR_TESTS,
}, async (context) => {
  const environment = await createEnvironment();
  context.after(() => environment.cleanup());
  await environment.clearFirestore();

  const uid = "canonical-rules-owner";
  const ownerDb = environment.authenticatedContext(uid).firestore();
  const otherDb = environment.authenticatedContext("canonical-rules-other").firestore();
  const ownerRoot = doc(ownerDb, "nutrition", uid);
  const ownerData = doc(ownerDb, "nutrition", uid, "data", "notes_2026-08-29");
  const otherRoot = doc(otherDb, "nutrition", uid);
  const otherData = doc(otherDb, "nutrition", uid, "data", "notes_2026-08-29");

  await assertSucceeds(setDoc(ownerRoot, {userName: "Owner"}));
  await assertSucceeds(setDoc(ownerData, {value: "created"}));
  await assertSucceeds(setDoc(ownerRoot, {userName: "Updated"}, {merge: true}));
  await assertSucceeds(setDoc(ownerData, {value: "updated"}, {merge: true}));
  await assertSucceeds(getDoc(ownerRoot));
  await assertSucceeds(getDoc(ownerData));

  await assertFails(getDoc(otherRoot));
  await assertFails(getDoc(otherData));
  await assertFails(setDoc(otherRoot, {userName: "Other"}, {merge: true}));
  await assertFails(setDoc(otherData, {value: "other"}, {merge: true}));
  await assertFails(deleteDoc(otherData));
  await assertFails(deleteDoc(otherRoot));

  await assertSucceeds(deleteDoc(ownerData));
  await assertFails(deleteDoc(ownerRoot));

  await environment.withSecurityRulesDisabled(async (adminContext) => {
    await assertSucceeds(deleteDoc(doc(adminContext.firestore(), "nutrition", uid)));
  });
});

test("canonical root and data writes reject oversized or malformed envelopes", {
  skip: !RUN_EMULATOR_TESTS,
}, async (context) => {
  const environment = await createEnvironment();
  context.after(() => environment.cleanup());
  await environment.clearFirestore();

  const uid = "envelope-rules-owner";
  const ownerDb = environment.authenticatedContext(uid).firestore();
  const rootRef = doc(ownerDb, "nutrition", uid);
  const dataRef = doc(ownerDb, "nutrition", uid, "data", "pantry_v2");
  const allowedRoot = {
    userName: "Owner", birthDate: "1997-12-04", gender: "male",
    height: 180, activityLevel: "moderate", goalType: "maintenance",
    goalKg: null, goalWeeks: null, tutorialSeen: true,
    tutorial_most_recent_version_seen: "0.11.0-beta",
    _dailyDates: ["2026-09-01"],
  };
  const oversizedRoot = {...allowedRoot, unexpected: true};

  await assertSucceeds(setDoc(rootRef, allowedRoot));
  await assertFails(setDoc(rootRef, oversizedRoot));
  await assertFails(setDoc(rootRef, {height: {unexpected: true}}, {merge: true}));
  await assertFails(setDoc(rootRef, {_dailyDates: "2026-09-01"}, {merge: true}));

  await assertSucceeds(setDoc(dataRef, {value: "[]"}));
  await assertFails(setDoc(dataRef, {}));
  await assertFails(setDoc(dataRef, {value: [], unexpected: true}));
  await assertFails(setDoc(dataRef, {value: {nested: true}}));
  await assertFails(setDoc(dataRef, {value: "x".repeat(900001)}));
  await assertFails(setDoc(
    doc(ownerDb, "nutrition", uid, "data", "userBirth"),
    {value: "legacy"},
  ));

  await assertSucceeds(setDoc(dataRef, {value: "updated"}, {merge: true}));
  await assertSucceeds(deleteDoc(dataRef));
});

test("root updates preserve but cannot mutate historical residual fields", {
  skip: !RUN_EMULATOR_TESTS,
}, async (context) => {
  const environment = await createEnvironment();
  context.after(() => environment.cleanup());
  await environment.clearFirestore();

  const uid = "historical-root-owner";
  const ownerDb = environment.authenticatedContext(uid).firestore();
  const rootRef = doc(ownerDb, "nutrition", uid);
  await environment.withSecurityRulesDisabled(async (adminContext) => {
    await setDoc(doc(adminContext.firestore(), "nutrition", uid), {
      userName: "Historical", pantry_v2: "legacy-residual",
      height: {legacy: "180"},
    });
  });

  await assertSucceeds(setDoc(rootRef, {lastActivityAt: "2026-09-01T12:00:00Z"}, {merge: true}));
  await assertFails(setDoc(rootRef, {pantry_v2: "changed"}, {merge: true}));
  await assertFails(setDoc(rootRef, {newResidual: true}, {merge: true}));
  await assertFails(setDoc(rootRef, {height: {legacy: "181"}}, {merge: true}));
  await assertSucceeds(setDoc(rootRef, {height: 181}, {merge: true}));
});

test("daily replacement batch can atomically mark migration and index its date", {
  skip: !RUN_EMULATOR_TESTS,
}, async (context) => {
  const environment = await createEnvironment();
  context.after(() => environment.cleanup());
  await environment.clearFirestore();

  const uid = "daily-replacement-owner";
  const ownerDb = environment.authenticatedContext(uid).firestore();
  await environment.withSecurityRulesDisabled(async (adminContext) => {
    await setDoc(doc(adminContext.firestore(), "nutrition", uid), {
      userName: "Historical", birthDate: "1997-12-04", gender: "male",
      height: {legacy: "180"}, activityLevel: "moderate", goalType: "maintenance",
      goalKg: null, goalWeeks: null, manualCalorieAdjustment: 0,
      proteinMultiplier: 1.6, bodyFatGoal: null, tutorialSeen: true,
      language: "pt", lastLoginAt: "2026-09-01T12:00:00Z",
      lastActivityAt: "2026-09-01T12:00:00Z",
      tutorial_most_recent_version_seen: "0.11.0-beta",
      _storageSchemaVerified: true,
      _storageSchemaVerifiedAt: "2026-09-01T12:00:00Z",
      _legacyCleanupDone: true, tutorialSeen_main: true,
      tutorialSeen_diario: true, tutorialSeen_adicionar: true,
      tutorialSeen_despensa: true, tutorialSeen_semana: true,
      tutorialSeen_metricas: true,
      _dailyDates: ["2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29"],
      _schemaVersion: 3, _schemaNormalizedAt: "2026-08-28T12:00:00Z",
      _schemaMigratedAt: "2026-08-28T12:00:00Z",
      _legacyCleanupAt: "2026-08-28T12:00:00Z",
    });
    await setDoc(doc(adminContext.firestore(), "nutrition", uid, "days", "2026-08-29", "migrations", "meal"), {
      schemaVersion: 1,
      kind: "meal",
      date: "2026-08-29",
      complete: true,
      updatedAt: new Date("2026-08-28T12:00:00Z"),
    });
    for (let index = 1; index <= 5; index += 1) {
      await setDoc(doc(adminContext.firestore(), "nutrition", uid, "days", "2026-08-29", "meals", `meal-${index}`), {
        id: `meal-${index}`,
        mealKey: "breakfast",
        entry: {},
        createdAt: new Date("2026-08-28T12:00:00Z"),
        updatedAt: new Date("2026-08-28T12:00:00Z"),
      });
    }
  });

  const batch = writeBatch(ownerDb);
  for (let index = 1; index <= 5; index += 1) {
    batch.delete(doc(ownerDb, "nutrition", uid, "days", "2026-08-29", "meals", `meal-${index}`));
  }
  batch.set(doc(ownerDb, "nutrition", uid, "days", "2026-08-29", "meals", "meal-new"), {
    schemaVersion: 1,
    id: "meal-new",
    date: "2026-08-29",
    mealKey: "Almoço",
    entry: {
      id: "meal-new", foodId: "food-1", name: "Arroz", qty: 100, unit: "g",
      foodSnapshot: {
        id: "food-1", name: "Arroz", unit: "g", protein100: 3,
        kcal100: 130, carbs100: 28, sugars100: null, fat100: 0.3,
        satfat100: null, fiber100: 0.4, salt100: 0.01, b12_100: null,
        niacin100: null, phosphorus100: null, vitd100: null,
        calcium100: null, iron100: null, potassium100: null,
        magnesium100: null, zinc100: null, vitc100: null,
      },
      protein: 3, kcal: 130, carbs: 28, sugars: null, fat: 0.3,
      satfat: null, fiber: 0.4, salt: 0.01, b12_: null, niacin: null,
      phosphorus: null, vitd: null, calcium: null, iron: null,
      potassium: null, magnesium: null, zinc: null, vitc: null, time: "12:30",
    },
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(ownerDb, "nutrition", uid, "days", "2026-08-29", "migrations", "meal"), {
    schemaVersion: 1,
    kind: "meal",
    date: "2026-08-29",
    complete: true,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(ownerDb, "nutrition", uid), {
    _dailyDates: arrayUnion("2026-08-29"),
  }, {merge: true});
  await assertSucceeds(batch.commit());
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
  const scoreComponent = scoreComponentFixture();

  await assertSucceeds(setDoc(mealRef, {
    schemaVersion: 1,
    id: "meal-1",
    date: "2026-08-29",
    mealKey: "Almoço",
    entry: {
      id: "meal-1", name: "Arroz", qty: 100, unit: "g",
      protein: 3, kcal: 130, time: "12:30",
    },
    updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(setDoc(waterRef, {
    schemaVersion: 1,
    id: "water-1",
    date: "2026-08-29",
    entry: {id: "water-1", ml: 250, time: "09:00"},
    updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(setDoc(supplementRef, {
    schemaVersion: 1,
    id: "supplement-1",
    date: "2026-08-29",
    entry: {id: "supplement-1", name: "Creatina", dose: 5, unit: "g", time: "08:00"},
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
  await assertSucceeds(setDoc(doc(ownerDb,
    "nutrition", uid, "days", "2026-08-29", "meals", "meal-score"), {
    schemaVersion: 1,
    id: "meal-score",
    date: "2026-08-29",
    mealKey: "Almoço",
    entry: {
      id: "meal-score", name: "Feijão", qty: 100, unit: "g",
      protein: 8, kcal: 120, time: "12:30", mealEvaluationId: "evaluation-1",
      mealScoreSnapshot: {
        algorithmVersion: "meal-score-v2", score: 4, coverage: 1,
        evaluatedAt: "2026-09-01T12:30:00Z", hoursLeft: 10, windowHours: 16,
        components: {protein: scoreComponent}, confidence: "high",
        provisional: false, provisionalReasons: [], applicableWeight: 1,
        mealOccurredAt: "2026-08-29T12:30:00Z",
      },
    },
    updatedAt: serverTimestamp(),
  }));
  await assertFails(setDoc(doc(ownerDb,
    "nutrition", uid, "days", "2026-08-29", "meals", "meal-bad-payload"), {
    schemaVersion: 1,
    id: "meal-bad-payload",
    date: "2026-08-29",
    mealKey: "Almoço",
    entry: {
      id: "meal-bad-payload", name: "Arroz", qty: 100, unit: "g",
      protein: 2, kcal: 130, time: "12:30", injected: "not-allowed",
    },
    updatedAt: serverTimestamp(),
  }));
  await assertFails(setDoc(doc(ownerDb,
    "nutrition", uid, "days", "2026-08-29", "meals", "meal-bad-score"), {
    schemaVersion: 1,
    id: "meal-bad-score",
    date: "2026-08-29",
    mealKey: "Almoço",
    entry: {
      id: "meal-bad-score", name: "Arroz", qty: 100, unit: "g",
      protein: 2, kcal: 130, time: "12:30", mealEvaluationId: "bad",
      mealScoreSnapshot: {
        algorithmVersion: "meal-score-v2", score: 4, coverage: 1,
        evaluatedAt: "2026-09-01T12:30:00Z", hoursLeft: 10, windowHours: 16,
        components: {protein: {...scoreComponent, injected: true}},
      },
    },
    updatedAt: serverTimestamp(),
  }));
  await assertFails(setDoc(doc(ownerDb,
    "nutrition", uid, "days", "2026-08-29", "water", "water-bad"), {
    schemaVersion: 1,
    id: "water-bad",
    date: "2026-08-29",
    entry: {id: "water-bad", ml: "250", time: "09:00"},
    updatedAt: serverTimestamp(),
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
  const racedRef = doc(ownerDb, "nutrition", uid, "data", "notes_2026-08-29");
  const lateRef = doc(ownerDb, "nutrition", uid, "data", "notes_2026-08-30");
  const granularRef = doc(
    ownerDb, "nutrition", uid, "days", "2026-08-29", "meals", "meal-raced",
  );
  const granularLateRef = doc(
    ownerDb, "nutrition", uid, "days", "2026-08-29", "water", "water-late",
  );
  const nestedPath = `nutrition/${uid}/data/notes_2026-08-29/details/deep`;

  await setDoc(userRef, {userName: "Owner"});
  await setDoc(racedRef, {value: "initial"});
  await setDoc(granularRef, {
    schemaVersion: 1,
    id: "meal-raced",
    date: "2026-08-29",
    mealKey: "Outro",
    entry: {
      id: "meal-raced", name: "Race", qty: 1, unit: "un",
      protein: 1, kcal: 10, time: "12:30",
    },
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
    (await adminDb.doc(`nutrition/${uid}/data/notes_2026-08-29`).get()).exists,
    false,
  );
  assert.equal(
    (await adminDb.doc(`nutrition/${uid}/data/notes_2026-08-30`).get()).exists,
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
