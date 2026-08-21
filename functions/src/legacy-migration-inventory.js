"use strict";

const {createHash} = require("node:crypto");

const DEFAULT_PAGE_SIZE = 200;
const MAX_PAGE_SIZE = 1000;
const NUTRITION_COLLECTION = "nutrition";

const PROFILE_TARGETS = new Set([
  "activityLevel",
  "birthDate",
  "bodyFatGoal",
  "gender",
  "goalKg",
  "goalType",
  "goalWeeks",
  "height",
  "language",
  "lastActivityAt",
  "lastLoginAt",
  "manualCalorieAdjustment",
  "proteinMultiplier",
  "tutorial_most_recent_version_seen",
  "tutorialSeen",
  "tutorialSeen_adicionar",
  "tutorialSeen_despensa",
  "tutorialSeen_diario",
  "tutorialSeen_main",
  "tutorialSeen_metricas",
  "tutorialSeen_semana",
  "userName",
]);

const DATA_TARGETS = new Set([
  "customGoals",
  "goalHistory",
  "mealTemplates",
  "pantry_v2",
  "suppPantry",
  "trainingByDate",
  "waterCustomPreset",
  "waterGoal",
  "weightHistory",
]);

const LEGACY_ALIASES = Object.freeze({
  pantry: Object.freeze({target: "pantry_v2", location: "data"}),
  userActivity: Object.freeze({target: "activityLevel", location: "root"}),
  userBirth: Object.freeze({target: "birthDate", location: "root"}),
  userGender: Object.freeze({target: "gender", location: "root"}),
});

const DATE_KEY_PATTERN = /^(log_v2|notes|waterIntake|suppLog)_(\d{4})-(\d{2})-(\d{2})$/;

class LegacyInventoryError extends Error {
  constructor(code, options = {}) {
    super(code, options);
    this.name = "LegacyInventoryError";
    this.code = code;
  }
}

function validatePageSize(pageSize) {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new LegacyInventoryError("invalid-page-size");
  }
  return pageSize;
}

function tokenIdentity(token) {
  if (token === undefined || token === null) return "<start>";
  if (typeof token === "string" || typeof token === "number") return String(token);
  throw new LegacyInventoryError("opaque-pagination-token");
}

async function collectCompletePages(fetchPage, {pageSize = DEFAULT_PAGE_SIZE} = {}) {
  if (typeof fetchPage !== "function") {
    throw new LegacyInventoryError("invalid-page-reader");
  }
  validatePageSize(pageSize);

  const items = [];
  const seenTokens = new Set();
  let cursor = null;

  for (;;) {
    const currentToken = tokenIdentity(cursor);
    if (seenTokens.has(currentToken)) {
      throw new LegacyInventoryError("pagination-cycle");
    }
    seenTokens.add(currentToken);

    const page = await fetchPage({cursor, pageSize});
    if (!page || !Array.isArray(page.items) || typeof page.complete !== "boolean") {
      throw new LegacyInventoryError("invalid-page-response");
    }
    items.push(...page.items);

    if (page.complete) return items;
    if (!page.items.length || page.nextCursor === undefined || page.nextCursor === null) {
      throw new LegacyInventoryError("incomplete-pagination");
    }
    cursor = page.nextCursor;
  }
}

function isValidCivilDate(yearText, monthText, dayText) {
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function classifyLegacyKey(key) {
  if (typeof key !== "string" || !key) {
    return Object.freeze({known: false, category: "unknown"});
  }

  const alias = LEGACY_ALIASES[key];
  if (alias) {
    return Object.freeze({
      known: true,
      category: `alias-${alias.location}`,
      location: alias.location,
      targets: Object.freeze([alias.target]),
    });
  }

  if (key === "userGoal") {
    return Object.freeze({
      known: true,
      category: "composite-profile",
      location: "root",
      targets: Object.freeze(["goalType", "goalKg", "goalWeeks"]),
    });
  }

  if (PROFILE_TARGETS.has(key)) {
    return Object.freeze({
      known: true,
      category: "profile",
      location: "root",
      targets: Object.freeze([key]),
    });
  }

  if (DATA_TARGETS.has(key)) {
    return Object.freeze({
      known: true,
      category: "data",
      location: "data",
      targets: Object.freeze([key]),
    });
  }

  const dated = DATE_KEY_PATTERN.exec(key);
  if (dated && isValidCivilDate(dated[2], dated[3], dated[4])) {
    return Object.freeze({
      known: true,
      category: `dated-${dated[1]}`,
      location: "data",
      targets: Object.freeze([key]),
    });
  }

  return Object.freeze({known: false, category: "unknown"});
}

function parseStoredValue(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    return value;
  }
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function valuesEqual(left, right) {
  return JSON.stringify(stableValue(parseStoredValue(left))) ===
    JSON.stringify(stableValue(parseStoredValue(right)));
}

function valueKind(value) {
  const parsed = parseStoredValue(value);
  if (Array.isArray(parsed)) return "array";
  if (parsed && typeof parsed === "object") return "object";
  if (parsed === undefined) return "missing";
  return "scalar";
}

function sanitizedFingerprint(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

function extractLegacyIdentity(documentId, knownUids) {
  if (knownUids.has(documentId)) return {kind: "canonical", uid: documentId};

  const matches = [];
  for (const uid of knownUids) {
    if (documentId.startsWith(`${uid}_`)) matches.push(uid);
  }
  matches.sort((left, right) => right.length - left.length);
  if (!matches.length) return {kind: "unclassified"};

  const uid = matches[0];
  return {
    kind: "legacy",
    uid,
    key: documentId.slice(uid.length + 1),
  };
}

function classifyTargetConflict(legacyValue, targetValue) {
  if (legacyValue === undefined) return "invalid-legacy-value";
  if (targetValue === undefined) return "target-missing";
  if (valuesEqual(legacyValue, targetValue)) return "identical";

  const legacyKind = valueKind(legacyValue);
  const targetKind = valueKind(targetValue);
  if (legacyKind !== targetKind) return "type-conflict";
  if (legacyKind === "array" || legacyKind === "object") return "merge-required";
  return "scalar-conflict";
}

function extractUserGoalTargets(value) {
  const parsed = parseStoredValue(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const targets = {
    goalType: parsed.goalType ?? parsed.type,
    goalKg: parsed.goalKg ?? parsed.kg,
    goalWeeks: parsed.goalWeeks ?? parsed.weeks,
  };
  return Object.values(targets).some(target => target !== undefined) ? targets : null;
}

function increment(counter, key, amount = 1) {
  counter[key] = (counter[key] || 0) + amount;
}

function validateReader(reader) {
  const expected = [
    "getDataDocument",
    "listAuthUsersPage",
    "listNutritionDocumentsPage",
  ];
  for (const method of expected) {
    if (typeof reader?.[method] !== "function") {
      throw new LegacyInventoryError("invalid-read-only-adapter");
    }
  }
}

async function buildLegacyMigrationInventory({
  reader,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) {
  validateReader(reader);
  validatePageSize(pageSize);

  const [authUsers, nutritionDocuments] = await Promise.all([
    collectCompletePages(
      options => reader.listAuthUsersPage(options),
      {pageSize},
    ),
    collectCompletePages(
      options => reader.listNutritionDocumentsPage(options),
      {pageSize},
    ),
  ]);

  const knownUids = new Set();
  for (const user of authUsers) {
    if (!user || typeof user.uid !== "string" || !user.uid) {
      throw new LegacyInventoryError("invalid-auth-user");
    }
    knownUids.add(user.uid);
  }

  const rootDocuments = new Map();
  const legacyDocuments = [];
  const unclassified = [];

  for (const document of nutritionDocuments) {
    if (!document || typeof document.id !== "string" || !document.id) {
      throw new LegacyInventoryError("invalid-nutrition-document");
    }
    const identity = extractLegacyIdentity(document.id, knownUids);
    if (identity.kind === "canonical") {
      rootDocuments.set(identity.uid, document.data || {});
    } else if (identity.kind === "legacy") {
      legacyDocuments.push({...identity, value: document.data?.value});
    } else {
      unclassified.push(document.id);
    }
  }

  const byKeyCategory = {};
  const byConflict = {};
  const unknownKeyFingerprints = [];
  const accountsWithLegacy = new Set();
  let targetReads = 0;

  for (const legacy of legacyDocuments) {
    accountsWithLegacy.add(legacy.uid);
    const classification = classifyLegacyKey(legacy.key);
    increment(byKeyCategory, classification.category);
    if (!classification.known) {
      unknownKeyFingerprints.push(sanitizedFingerprint(legacy.key));
      continue;
    }

    const root = rootDocuments.get(legacy.uid) || {};
    if (legacy.key === "userGoal") {
      const extracted = extractUserGoalTargets(legacy.value);
      if (!extracted) {
        increment(byConflict, "invalid-composite-value");
        continue;
      }
      for (const target of classification.targets) {
        const sourceValue = extracted[target];
        if (sourceValue === undefined) continue;
        increment(byConflict, classifyTargetConflict(sourceValue, root[target]));
      }
      continue;
    }

    const target = classification.targets[0];
    let targetValue;
    if (classification.location === "root") {
      targetValue = root[target];
    } else {
      const snapshot = await reader.getDataDocument(legacy.uid, target);
      targetReads++;
      targetValue = snapshot?.exists ? snapshot.data?.value : undefined;
    }
    increment(byConflict, classifyTargetConflict(legacy.value, targetValue));
  }

  const blockingConflicts = (byConflict["scalar-conflict"] || 0) +
    (byConflict["type-conflict"] || 0) +
    (byConflict["invalid-legacy-value"] || 0) +
    (byConflict["invalid-composite-value"] || 0);
  const complete = unclassified.length === 0 && unknownKeyFingerprints.length === 0;

  return Object.freeze({
    mode: "dry-run",
    readOnly: true,
    complete,
    readyForCopy: complete && blockingConflicts === 0,
    counts: Object.freeze({
      authUsers: authUsers.length,
      nutritionDocuments: nutritionDocuments.length,
      canonicalAccounts: rootDocuments.size,
      legacyDocuments: legacyDocuments.length,
      accountsWithLegacy: accountsWithLegacy.size,
      unclassifiedDocuments: unclassified.length,
      unknownKeys: unknownKeyFingerprints.length,
      targetReads,
      blockingConflicts,
    }),
    byKeyCategory: Object.freeze({...byKeyCategory}),
    byConflict: Object.freeze({...byConflict}),
    blockers: Object.freeze({
      unclassifiedDocumentFingerprints: Object.freeze(
        unclassified.map(sanitizedFingerprint).sort(),
      ),
      unknownKeyFingerprints: Object.freeze(unknownKeyFingerprints.sort()),
    }),
  });
}

function createAdminReadAdapter({auth, firestore, documentIdField} = {}) {
  if (typeof auth?.listUsers !== "function" ||
      typeof firestore?.collection !== "function" ||
      !documentIdField) {
    throw new LegacyInventoryError("invalid-admin-read-dependencies");
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

    async listNutritionDocumentsPage({cursor, pageSize}) {
      let query = firestore.collection(NUTRITION_COLLECTION)
        .select("value", ...PROFILE_TARGETS)
        .orderBy(documentIdField)
        .limit(pageSize);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      const items = snapshot.docs.map(document => ({
        id: document.id,
        data: document.data() || {},
      }));
      return {
        items,
        complete: items.length < pageSize,
        nextCursor: items.length ? items[items.length - 1].id : null,
      };
    },

    async getDataDocument(uid, key) {
      const snapshot = await firestore.collection(NUTRITION_COLLECTION)
        .doc(uid)
        .collection("data")
        .doc(key)
        .get();
      return {
        exists: snapshot.exists === true,
        data: snapshot.exists === true ? snapshot.data() || {} : null,
      };
    },
  });
}

module.exports = {
  DATA_TARGETS,
  DEFAULT_PAGE_SIZE,
  LEGACY_ALIASES,
  LegacyInventoryError,
  MAX_PAGE_SIZE,
  PROFILE_TARGETS,
  buildLegacyMigrationInventory,
  classifyLegacyKey,
  classifyTargetConflict,
  collectCompletePages,
  createAdminReadAdapter,
  extractLegacyIdentity,
};
