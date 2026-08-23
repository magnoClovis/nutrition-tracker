"use strict";

const {
  DEFAULT_PAGE_SIZE,
  LegacyInventoryError,
  buildLegacyMigrationInventory,
  classifyLegacyKey,
  collectCompletePages,
  extractLegacyIdentity,
  extractUserGoalTargets,
  normalizeProfileValue,
  parseStoredValue,
  valueKind,
  valuesEqual,
} = require("./legacy-migration-inventory.js");

function migrationError(code) {
  return new LegacyInventoryError(code);
}

function stableArrayIdentity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.id !== undefined && value.id !== null && String(value.id).trim()) {
    return `id:${String(value.id).trim()}`;
  }
  if (value.date !== undefined && value.date !== null && String(value.date).trim()) {
    return `date:${String(value.date).trim()}`;
  }
  if (value.name !== undefined && value.name !== null && String(value.name).trim()) {
    return `name:${String(value.name).trim().toLocaleLowerCase("en-US")}`;
  }
  return null;
}

function mergeStructured(legacyValue, canonicalValue) {
  const legacy = parseStoredValue(legacyValue);
  const canonical = parseStoredValue(canonicalValue);
  if (Array.isArray(legacy) && Array.isArray(canonical)) {
    const legacyEntries = legacy.map(item => [stableArrayIdentity(item), item]);
    const canonicalEntries = canonical.map(item => [stableArrayIdentity(item), item]);
    if ([...legacyEntries, ...canonicalEntries].some(([identity]) => !identity)) {
      throw migrationError("array-item-without-stable-identity");
    }
    const legacyByIdentity = new Map(legacyEntries);
    const merged = canonicalEntries.map(([identity, item]) => {
      const previous = legacyByIdentity.get(identity);
      legacyByIdentity.delete(identity);
      if (previous && valueKind(previous) === "object" && valueKind(item) === "object") {
        return mergeStructured(previous, item);
      }
      return item;
    });
    for (const [identity, item] of legacyEntries) {
      if (legacyByIdentity.has(identity)) {
        merged.push(item);
        legacyByIdentity.delete(identity);
      }
    }
    return merged;
  }

  if (valueKind(legacy) === "object" && valueKind(canonical) === "object") {
    const merged = {...legacy};
    for (const [key, canonicalEntry] of Object.entries(canonical)) {
      if (Object.prototype.hasOwnProperty.call(legacy, key) &&
          ["array", "object"].includes(valueKind(legacy[key])) &&
          valueKind(legacy[key]) === valueKind(canonicalEntry)) {
        merged[key] = mergeStructured(legacy[key], canonicalEntry);
      } else {
        merged[key] = canonicalEntry;
      }
    }
    return merged;
  }

  throw migrationError("unmergeable-structured-value");
}

function storageValue(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function resolveDesiredValue({location, target, sourceValue, targetValue}) {
  const normalizedSource = location === "root" ?
    normalizeProfileValue(target, sourceValue) : sourceValue;
  const normalizedTarget = location === "root" && targetValue !== undefined ?
    normalizeProfileValue(target, targetValue) : targetValue;

  if (normalizedSource === undefined) throw migrationError("invalid-legacy-value");
  if (normalizedTarget === undefined) return normalizedSource;
  if (valuesEqual(normalizedSource, normalizedTarget)) return normalizedTarget;
  if (valueKind(normalizedSource) !== valueKind(normalizedTarget) ||
      !["array", "object"].includes(valueKind(normalizedSource))) {
    throw migrationError("unresolved-target-conflict");
  }
  const merged = mergeStructured(normalizedSource, normalizedTarget);
  return location === "data" ? storageValue(merged) : merged;
}

function validateCopyAdapter(adapter) {
  for (const method of [
    "getDataDocument",
    "listAuthUsersPage",
    "listNutritionDocumentsPage",
    "readSource",
    "readTarget",
    "writeTargetTransaction",
  ]) {
    if (typeof adapter?.[method] !== "function") {
      throw migrationError("invalid-admin-copy-adapter");
    }
  }
}

async function buildLegacyCopyPlan({adapter, pageSize = DEFAULT_PAGE_SIZE} = {}) {
  validateCopyAdapter(adapter);
  const report = await buildLegacyMigrationInventory({reader: adapter, pageSize});
  if (!report.readyForCopy) throw migrationError("dry-run-not-ready-for-copy");

  const [authUsers, nutritionDocuments] = await Promise.all([
    collectCompletePages(options => adapter.listAuthUsersPage(options), {pageSize}),
    collectCompletePages(
      options => adapter.listNutritionDocumentsPage(options),
      {pageSize},
    ),
  ]);
  const knownUids = new Set(authUsers.map(user => user.uid));
  const roots = new Map();
  const legacy = [];
  for (const document of nutritionDocuments) {
    const identity = extractLegacyIdentity(document.id, knownUids);
    if (identity.kind === "canonical") roots.set(identity.uid, document.data || {});
    if (identity.kind === "legacy") {
      legacy.push({...identity, sourceId: document.id, value: document.data?.value});
    }
  }

  const operations = [];
  const targetIdentities = new Set();
  for (const source of legacy) {
    const classification = classifyLegacyKey(source.key);
    if (!classification.known) throw migrationError("unknown-key-during-copy-plan");
    let values;
    if (source.key === "userGoal") {
      values = extractUserGoalTargets(source.value);
      if (!values) throw migrationError("invalid-composite-value");
    } else {
      values = {[classification.targets[0]]: source.value};
    }

    for (const target of classification.targets) {
      const sourceValue = values[target];
      if (sourceValue === undefined) continue;
      let targetValue;
      if (classification.location === "root") {
        targetValue = roots.get(source.uid)?.[target];
      } else {
        const snapshot = await adapter.getDataDocument(source.uid, target);
        targetValue = snapshot?.exists ? snapshot.data?.value : undefined;
      }
      const targetIdentity = `${source.uid}\u0000${classification.location}\u0000${target}`;
      if (targetIdentities.has(targetIdentity)) {
        throw migrationError("multiple-sources-for-one-target");
      }
      targetIdentities.add(targetIdentity);
      operations.push(Object.freeze({
        uid: source.uid,
        sourceId: source.sourceId,
        sourceKey: source.key,
        sourceValue: source.value,
        location: classification.location,
        target,
        targetValue,
        desiredValue: resolveDesiredValue({
          location: classification.location,
          target,
          sourceValue,
          targetValue,
        }),
      }));
    }
  }
  return Object.freeze({report, operations: Object.freeze(operations)});
}

function sourceUnchanged(snapshot, operation) {
  return snapshot?.exists === true &&
    valuesEqual(snapshot.data?.value, operation.sourceValue);
}

function targetUnchanged(snapshot, operation) {
  const value = snapshot?.exists === true ? snapshot.value : undefined;
  return valuesEqual(value, operation.targetValue);
}

async function executeLegacyCopy({
  adapter,
  expectedLegacyDocuments,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) {
  if (!Number.isInteger(expectedLegacyDocuments) || expectedLegacyDocuments < 1) {
    throw migrationError("expected-legacy-count-required");
  }
  const plan = await buildLegacyCopyPlan({adapter, pageSize});
  if (plan.report.counts.legacyDocuments !== expectedLegacyDocuments) {
    throw migrationError("legacy-document-count-changed");
  }

  for (const operation of plan.operations) {
    const [source, target] = await Promise.all([
      adapter.readSource(operation),
      adapter.readTarget(operation),
    ]);
    if (!sourceUnchanged(source, operation) || !targetUnchanged(target, operation)) {
      throw migrationError("preflight-state-changed");
    }
  }

  let writtenTargets = 0;
  let identicalTargets = 0;
  for (const operation of plan.operations) {
    if (valuesEqual(operation.targetValue, operation.desiredValue)) {
      identicalTargets++;
      continue;
    }
    await adapter.writeTargetTransaction(operation);
    writtenTargets++;
  }

  const verifiedSources = new Set();
  for (const operation of plan.operations) {
    const [source, target] = await Promise.all([
      adapter.readSource(operation),
      adapter.readTarget(operation),
    ]);
    if (!sourceUnchanged(source, operation)) {
      throw migrationError("legacy-source-verification-failed");
    }
    if (target?.exists !== true || !valuesEqual(target.value, operation.desiredValue)) {
      throw migrationError("destination-verification-failed");
    }
    verifiedSources.add(operation.sourceId);
  }

  if (verifiedSources.size !== expectedLegacyDocuments) {
    throw migrationError("not-every-source-was-verified");
  }
  return Object.freeze({
    mode: "copy-and-verify",
    legacyDocuments: expectedLegacyDocuments,
    targetOperations: plan.operations.length,
    writtenTargets,
    identicalTargets,
    verifiedLegacyDocuments: verifiedSources.size,
    legacyDocumentsDeleted: 0,
  });
}

function createAdminCopyAdapter({auth, firestore, documentIdField} = {}) {
  if (typeof auth?.listUsers !== "function" ||
      typeof firestore?.collection !== "function" ||
      typeof firestore?.runTransaction !== "function" ||
      !documentIdField) {
    throw migrationError("invalid-admin-copy-dependencies");
  }
  const nutrition = () => firestore.collection("nutrition");
  const sourceReference = operation => nutrition().doc(operation.sourceId);
  const targetReference = operation => operation.location === "root" ?
    nutrition().doc(operation.uid) :
    nutrition().doc(operation.uid).collection("data").doc(operation.target);
  const targetValue = (snapshot, operation) => {
    if (!snapshot.exists) return undefined;
    return operation.location === "root" ?
      snapshot.data()?.[operation.target] : snapshot.data()?.value;
  };

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
      let query = nutrition().orderBy(documentIdField).limit(pageSize);
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
      const snapshot = await nutrition().doc(uid).collection("data").doc(key).get();
      return {
        exists: snapshot.exists,
        data: snapshot.exists ? snapshot.data() || {} : null,
      };
    },
    async readSource(operation) {
      const snapshot = await sourceReference(operation).get();
      return {exists: snapshot.exists, data: snapshot.exists ? snapshot.data() : null};
    },
    async readTarget(operation) {
      const snapshot = await targetReference(operation).get();
      return {exists: snapshot.exists, value: targetValue(snapshot, operation)};
    },
    async writeTargetTransaction(operation) {
      await firestore.runTransaction(async transaction => {
        const sourceRef = sourceReference(operation);
        const targetRef = targetReference(operation);
        const [source, target] = await Promise.all([
          transaction.get(sourceRef),
          transaction.get(targetRef),
        ]);
        if (!source.exists ||
            !valuesEqual(source.data()?.value, operation.sourceValue) ||
            !valuesEqual(targetValue(target, operation), operation.targetValue)) {
          throw migrationError("transaction-state-changed");
        }
        const data = operation.location === "root" ?
          {[operation.target]: operation.desiredValue} :
          {value: operation.desiredValue};
        transaction.set(targetRef, data, {merge: true});
      });
    },
  });
}

module.exports = {
  buildLegacyCopyPlan,
  createAdminCopyAdapter,
  executeLegacyCopy,
  mergeStructured,
  normalizeProfileValue,
  resolveDesiredValue,
  stableArrayIdentity,
};
