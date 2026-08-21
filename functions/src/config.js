"use strict";

const CALLABLE_REGION = "europe-southwest1";
const TASK_REGION = "europe-west1";
const PRODUCTION_PROJECT_ID = "nutrition-tracker-780b3";
const EMULATOR_PROJECT_ID = "demo-trofia-c22";
const ACCOUNT_DELETION_JOBS_COLLECTION = "accountDeletionJobs";
const ACCOUNT_DELETION_TASK_FUNCTION = "processAccountDeletionTask";
const DELETION_MAX_ATTEMPTS = 5;
const FAILED_JOB_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const RECONCILIATION_STALE_MS = 6 * 60 * 60 * 1000;
const RECONCILIATION_LEASE_MS = 15 * 60 * 1000;
const RECONCILIATION_RETRY_MS = 5 * 60 * 1000;

const DELETION_TASK_OPTIONS = Object.freeze({
  region: TASK_REGION,
  retryConfig: Object.freeze({
    maxAttempts: DELETION_MAX_ATTEMPTS,
    maxRetrySeconds: 24 * 60 * 60,
    minBackoffSeconds: 60,
    maxBackoffSeconds: 60 * 60,
    maxDoublings: 4,
  }),
  rateLimits: Object.freeze({
    maxConcurrentDispatches: 2,
    maxDispatchesPerSecond: 1,
  }),
  timeoutSeconds: 9 * 60,
});

module.exports = Object.freeze({
  ACCOUNT_DELETION_JOBS_COLLECTION,
  ACCOUNT_DELETION_TASK_FUNCTION,
  CALLABLE_REGION,
  DELETION_MAX_ATTEMPTS,
  DELETION_TASK_OPTIONS,
  TASK_REGION,
  PRODUCTION_PROJECT_ID,
  EMULATOR_PROJECT_ID,
  FAILED_JOB_RETENTION_MS,
  RECONCILIATION_LEASE_MS,
  RECONCILIATION_RETRY_MS,
  RECONCILIATION_STALE_MS,
});
