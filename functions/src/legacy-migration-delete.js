"use strict";

const {
  DEFAULT_PAGE_SIZE,
  LegacyInventoryError,
  buildLegacyMigrationInventory,
  valuesEqual,
} = require("./legacy-migration-inventory.js");
const {
  buildLegacyCopyPlan,
  createAdminCopyAdapter,
} = require("./legacy-migration-copy.js");

function migrationError(code) {
  return new LegacyInventoryError(code);
}

function groupOperationsBySource(operations) {
  const grouped = new Map();
  for (const operation of operations) {
    const current = grouped.get(operation.sourceId);
    if (current && !valuesEqual(current.sourceValue, operation.sourceValue)) {
      throw migrationError("inconsistent-source-plan");
    }
    if (current) {
      current.operations.push(operation);
    } else {
      grouped.set(operation.sourceId, {
        sourceId: operation.sourceId,
        sourceValue: operation.sourceValue,
        operations: [operation],
      });
    }
  }
  return Object.freeze([...grouped.values()].map(group => Object.freeze({
    ...group,
    operations: Object.freeze([...group.operations]),
  })));
}

function sourceMatches(snapshot, operation) {
  return snapshot?.exists === true &&
    valuesEqual(snapshot.data?.value, operation.sourceValue);
}

function destinationMatches(snapshot, operation) {
  return snapshot?.exists === true &&
    valuesEqual(snapshot.value, operation.desiredValue);
}

async function executeLegacyDeletion({
  adapter,
  expectedLegacyDocuments,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) {
  if (!Number.isInteger(expectedLegacyDocuments) || expectedLegacyDocuments < 1) {
    throw migrationError("expected-legacy-count-required");
  }
  if (typeof adapter?.deleteVerifiedSourcesTransaction !== "function") {
    throw migrationError("invalid-admin-delete-adapter");
  }

  const plan = await buildLegacyCopyPlan({adapter, pageSize});
  if (plan.report.counts.legacyDocuments !== expectedLegacyDocuments) {
    throw migrationError("legacy-document-count-changed");
  }
  const sourceGroups = groupOperationsBySource(plan.operations);
  if (sourceGroups.length !== expectedLegacyDocuments) {
    throw migrationError("not-every-source-has-a-destination");
  }

  for (const group of sourceGroups) {
    for (const operation of group.operations) {
      const [source, target] = await Promise.all([
        adapter.readSource(operation),
        adapter.readTarget(operation),
      ]);
      if (!sourceMatches(source, operation)) {
        throw migrationError("legacy-source-verification-failed");
      }
      if (!destinationMatches(target, operation)) {
        throw migrationError("destination-verification-failed");
      }
    }
  }

  await adapter.deleteVerifiedSourcesTransaction(sourceGroups);

  const finalReport = await buildLegacyMigrationInventory({
    reader: adapter,
    pageSize,
  });
  if (!finalReport.complete || finalReport.counts.legacyDocuments !== 0) {
    throw migrationError("legacy-final-count-not-zero");
  }

  return Object.freeze({
    mode: "verified-atomic-delete",
    verifiedLegacyDocuments: expectedLegacyDocuments,
    deletedLegacyDocuments: expectedLegacyDocuments,
    remainingLegacyDocuments: finalReport.counts.legacyDocuments,
    canonicalAccounts: finalReport.counts.canonicalAccounts,
  });
}

function createAdminDeletionAdapter({auth, firestore, documentIdField} = {}) {
  const copyAdapter = createAdminCopyAdapter({auth, firestore, documentIdField});
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
    ...copyAdapter,
    async deleteVerifiedSourcesTransaction(sourceGroups) {
      if (!Array.isArray(sourceGroups) || !sourceGroups.length ||
          sourceGroups.length > 400) {
        throw migrationError("invalid-delete-transaction-size");
      }
      await firestore.runTransaction(async transaction => {
        const sources = [];
        for (const group of sourceGroups) {
          const sourceRef = sourceReference(group);
          const sourceSnapshot = await transaction.get(sourceRef);
          if (!sourceSnapshot.exists ||
              !valuesEqual(sourceSnapshot.data()?.value, group.sourceValue)) {
            throw migrationError("transaction-source-changed");
          }
          sources.push(sourceRef);

          for (const operation of group.operations) {
            const targetSnapshot = await transaction.get(targetReference(operation));
            if (!targetSnapshot.exists ||
                !valuesEqual(targetValue(targetSnapshot, operation),
                  operation.desiredValue)) {
              throw migrationError("transaction-destination-changed");
            }
          }
        }
        for (const sourceRef of sources) transaction.delete(sourceRef);
      });
    },
  });
}

module.exports = {
  createAdminDeletionAdapter,
  executeLegacyDeletion,
  groupOperationsBySource,
};
