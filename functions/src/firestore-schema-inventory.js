"use strict";

const {createHash} = require("node:crypto");
const {
  collectCompletePages,
  DEFAULT_PAGE_SIZE,
} = require("./legacy-migration-inventory.js");

const ROOT_FIELDS = new Set([
  "birthDate", "gender", "height", "activityLevel", "goalType", "goalKg",
  "goalWeeks", "manualCalorieAdjustment", "proteinMultiplier", "bodyFatGoal",
  "userName", "tutorialSeen", "language", "lastLoginAt", "lastActivityAt",
  "tutorial_most_recent_version_seen", "_storageSchemaVerified",
  "_storageSchemaVerifiedAt", "_legacyCleanupDone", "tutorialSeen_main",
  "tutorialSeen_diario", "tutorialSeen_adicionar", "tutorialSeen_despensa",
  "tutorialSeen_semana", "tutorialSeen_metricas", "_dailyDates",
]);

const STATIC_DATA_KEYS = new Set([
  "customGoals", "goalHistory", "mealTemplates", "pantry_v2", "suppPantry",
  "trainingByDate", "waterCustomPreset", "waterGoal", "weightHistory",
  "seenVisualUpdateNotice_0.8.1", "tutorialSeen_release-highlights",
]);
const DATED_DATA_KEY = /^(log_v2|notes|waterIntake|suppLog)_(\d{4}-\d{2}-\d{2})$/;
const COLLECTION_GROUPS = Object.freeze([
  "data", "meals", "water", "supplements", "migrations",
]);

class SchemaInventoryError extends Error {
  constructor(code, options = {}) {
    super(code, options);
    this.name = "SchemaInventoryError";
    this.code = code;
  }
}

function fingerprint(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (value instanceof Date || typeof value?.toDate === "function") return "timestamp";
  if (value && typeof value === "object") return "map";
  return typeof value;
}

function increment(counter, key, amount = 1) {
  counter[key] = (counter[key] || 0) + amount;
}

function observeFields(target, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    increment(target, `<document>:${valueType(value)}`);
    return;
  }
  for (const [field, fieldValue] of Object.entries(value)) {
    increment(target, `${field}:${valueType(fieldValue)}`);
  }
}

function observeNestedFields(target, value, prefix = "", depth = 0) {
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 4) return;
  for (const [field, fieldValue] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${field}` : field;
    increment(target, `${path}:${valueType(fieldValue)}`);
    if (valueType(fieldValue) === "map") {
      observeNestedFields(target, fieldValue, path, depth + 1);
    }
  }
}

function validCivilDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function classifyDataKey(key) {
  if (STATIC_DATA_KEYS.has(key)) return key;
  const match = DATED_DATA_KEY.exec(key);
  if (match && validCivilDate(match[2])) return `${match[1]}_<civil-date>`;
  return null;
}

function validateReader(reader) {
  for (const method of [
    "listAuthUsersPage", "listNutritionRootsPage", "listCollectionGroupPage",
  ]) {
    if (typeof reader?.[method] !== "function") {
      throw new SchemaInventoryError("invalid-read-only-adapter");
    }
  }
}

function validateDocument(document) {
  if (!document || typeof document.path !== "string" ||
      !document.path || !document.data || typeof document.data !== "object" ||
      Array.isArray(document.data)) {
    throw new SchemaInventoryError("invalid-document-record");
  }
  return document;
}

function parseCanonicalPath(path, group) {
  const parts = path.split("/");
  if (group === "data" && parts.length === 4 &&
      parts[0] === "nutrition" && parts[2] === "data") {
    return {uid: parts[1], key: parts[3]};
  }
  if (["meals", "water", "supplements", "migrations"].includes(group) &&
      parts.length === 6 && parts[0] === "nutrition" && parts[2] === "days" &&
      parts[4] === group && validCivilDate(parts[3])) {
    return {uid: parts[1], date: parts[3], id: parts[5]};
  }
  return null;
}

async function buildFirestoreSchemaInventory({reader, pageSize = DEFAULT_PAGE_SIZE} = {}) {
  validateReader(reader);
  const [authUsers, roots, ...groups] = await Promise.all([
    collectCompletePages(options => reader.listAuthUsersPage(options), {pageSize}),
    collectCompletePages(options => reader.listNutritionRootsPage(options), {pageSize}),
    ...COLLECTION_GROUPS.map(group => collectCompletePages(
      options => reader.listCollectionGroupPage(group, options), {pageSize},
    )),
  ]);

  const authUids = new Set();
  for (const user of authUsers) {
    if (!user || typeof user.uid !== "string" || !user.uid) {
      throw new SchemaInventoryError("invalid-auth-user");
    }
    authUids.add(user.uid);
  }

  const rootFields = {};
  const rootUids = new Set();
  const canonicalRootUids = new Set();
  const unknownRootFields = new Set();
  let orphanRoots = 0;
  for (const raw of roots) {
    const document = validateDocument(raw);
    const parts = document.path.split("/");
    if (parts.length !== 2 || parts[0] !== "nutrition" || !parts[1]) {
      throw new SchemaInventoryError("invalid-root-path");
    }
    rootUids.add(parts[1]);
    if (!authUids.has(parts[1])) {
      orphanRoots++;
      continue;
    }
    canonicalRootUids.add(parts[1]);
    Object.entries(document.data).forEach(([field, fieldValue]) => {
      if (ROOT_FIELDS.has(field)) increment(rootFields, `${field}:${valueType(fieldValue)}`);
      else unknownRootFields.add(fingerprint(field));
    });
  }

  const collectionCounts = {};
  const outerFields = {};
  const entryFields = {meals: {}, water: {}, supplements: {}};
  const nestedEntryFields = {meals: {}, water: {}, supplements: {}};
  const dataKeyCategories = {};
  const unknownDataKeys = new Set();
  const invalidPathFingerprints = new Set();
  let orphanNestedDocuments = 0;
  let invalidDataEnvelopes = 0;

  for (let index = 0; index < COLLECTION_GROUPS.length; index++) {
    const group = COLLECTION_GROUPS[index];
    const documents = groups[index];
    collectionCounts[group] = documents.length;
    outerFields[group] = {};
    for (const raw of documents) {
      const document = validateDocument(raw);
      const identity = parseCanonicalPath(document.path, group);
      if (!identity) {
        invalidPathFingerprints.add(fingerprint(document.path));
        continue;
      }
      if (!authUids.has(identity.uid)) {
        orphanNestedDocuments++;
        continue;
      }
      observeFields(outerFields[group], document.data);
      if (group === "data") {
        const category = classifyDataKey(identity.key);
        if (category) increment(dataKeyCategories, category);
        else unknownDataKeys.add(fingerprint(identity.key));
        if (Object.keys(document.data).length !== 1 ||
            typeof document.data.value !== "string") invalidDataEnvelopes++;
      } else if (group !== "migrations") {
        observeFields(entryFields[group], document.data.entry);
        observeNestedFields(nestedEntryFields[group], document.data.entry);
      }
    }
  }

  const missingRoots = [...authUids].filter(uid => !rootUids.has(uid)).length;
  const blockers = {
    orphanRoots,
    orphanNestedDocuments,
    invalidDataEnvelopes,
    invalidPathFingerprints: [...invalidPathFingerprints].sort(),
    unknownRootFieldFingerprints: [...unknownRootFields].sort(),
    unknownDataKeyFingerprints: [...unknownDataKeys].sort(),
  };
  const complete = orphanRoots === 0 && orphanNestedDocuments === 0 &&
    invalidDataEnvelopes === 0 && invalidPathFingerprints.size === 0 &&
    unknownRootFields.size === 0 && unknownDataKeys.size === 0;

  return Object.freeze({
    mode: "dry-run",
    readOnly: true,
    sanitized: true,
    complete,
    counts: Object.freeze({
      authUsers: authUsers.length,
      nutritionRoots: roots.length,
      canonicalRoots: canonicalRootUids.size,
      missingRoots,
      ...collectionCounts,
    }),
    observed: Object.freeze({
      rootFields: Object.freeze({...rootFields}),
      dataKeyCategories: Object.freeze({...dataKeyCategories}),
      outerFields: Object.freeze(outerFields),
      entryFields: Object.freeze(entryFields),
      nestedEntryFields: Object.freeze(nestedEntryFields),
    }),
    blockers: Object.freeze(blockers),
  });
}

function createAdminSchemaReadAdapter({auth, firestore, documentIdField} = {}) {
  if (typeof auth?.listUsers !== "function" ||
      typeof firestore?.collection !== "function" ||
      typeof firestore?.collectionGroup !== "function" || !documentIdField) {
    throw new SchemaInventoryError("invalid-admin-read-dependencies");
  }

  function pageFromSnapshot(snapshot, pageSize) {
    const items = snapshot.docs.map(document => ({
      path: document.ref.path,
      data: document.data() || {},
    }));
    return {
      items,
      complete: items.length < pageSize,
      nextCursor: snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].ref.path : null,
    };
  }

  async function runQuery(query, cursor, pageSize) {
    let paged = query.orderBy(documentIdField).limit(pageSize);
    if (cursor) paged = paged.startAfter(cursor);
    return pageFromSnapshot(await paged.get(), pageSize);
  }

  return Object.freeze({
    async listAuthUsersPage({cursor, pageSize}) {
      const result = await auth.listUsers(pageSize, cursor || undefined);
      return {
        items: (result.users || []).map(user => ({uid: user.uid})),
        complete: !result.pageToken,
        nextCursor: result.pageToken || null,
      };
    },
    listNutritionRootsPage({cursor, pageSize}) {
      return runQuery(firestore.collection("nutrition"), cursor, pageSize);
    },
    listCollectionGroupPage(group, {cursor, pageSize}) {
      if (!COLLECTION_GROUPS.includes(group)) {
        throw new SchemaInventoryError("invalid-collection-group");
      }
      return runQuery(firestore.collectionGroup(group), cursor, pageSize);
    },
  });
}

module.exports = {
  COLLECTION_GROUPS,
  ROOT_FIELDS,
  STATIC_DATA_KEYS,
  SchemaInventoryError,
  buildFirestoreSchemaInventory,
  classifyDataKey,
  createAdminSchemaReadAdapter,
  parseCanonicalPath,
  valueType,
};
