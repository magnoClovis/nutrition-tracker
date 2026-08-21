"use strict";

const {getApps, initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore} = require("firebase-admin/firestore");
const {getFunctions} = require("firebase-admin/functions");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onTaskDispatched} = require("firebase-functions/v2/tasks");
const {HttpsError, onCall} = require("firebase-functions/v2/https");

const {createAccountDeletionJobRepository} = require(
  "./account-deletion-jobs.js",
);
const {
  createAccountDeletionReconciler,
  createAccountDeletionTaskProcessor,
} = require("./account-deletion-task.js");
const {createAccountDeletionRequestService} = require(
  "./account-deletion-request.js",
);
const {
  ACCOUNT_DELETION_TASK_FUNCTION,
  DELETION_TASK_OPTIONS,
  PRODUCTION_PROJECT_ID,
  REGION,
} = require("./config.js");
const {createFirestoreAccountDeletionOperations} = require(
  "./firestore-account-deletion.js",
);

const app = getApps()[0] || initializeApp({
  projectId: process.env.GCLOUD_PROJECT || PRODUCTION_PROJECT_ID,
});
const firestore = getFirestore(app);
const auth = getAuth(app);
const taskQueue = getFunctions(app).taskQueue(
  `locations/${REGION}/functions/${ACCOUNT_DELETION_TASK_FUNCTION}`,
);
const jobRepository = createAccountDeletionJobRepository({firestore});
const deletionOperations = createFirestoreAccountDeletionOperations({
  firestore,
});
const taskProcessor = createAccountDeletionTaskProcessor({
  jobRepository,
  deletionOperations,
  deleteAuthUser: (job) => auth.deleteUser(job.uid),
});
const reconciler = createAccountDeletionReconciler({
  jobRepository,
  enqueueTask: (data) => taskQueue.enqueue(data, {
    id: data.requestId,
    dispatchDeadlineSeconds: 8 * 60,
  }),
});
const requestService = createAccountDeletionRequestService({
  firestore,
  enqueueTask: (data) => taskQueue.enqueue(data, {
    id: data.requestId,
    dispatchDeadlineSeconds: 8 * 60,
  }),
});

const requestAccountDeletion = onCall(
  {
    region: REGION,
    enforceAppCheck: true,
    timeoutSeconds: 30,
    maxInstances: 10,
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }
    const authTimeSeconds = Number(request.auth.token?.auth_time);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (
      !Number.isFinite(authTimeSeconds) ||
      authTimeSeconds > nowSeconds + 60 ||
      nowSeconds - authTimeSeconds > 5 * 60
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Recent authentication is required.",
      );
    }

    try {
      return await requestService.request({
        uid: request.auth.uid,
        requestId: request.data?.requestId,
      });
    } catch (_) {
      throw new HttpsError(
        "failed-precondition",
        "Account deletion could not be started.",
      );
    }
  },
);

const processAccountDeletionTask = onTaskDispatched(
  DELETION_TASK_OPTIONS,
  async (request) => {
    await taskProcessor.process(request);
  },
);

const reconcileAccountDeletionJobs = onSchedule(
  {
    region: REGION,
    schedule: "every 60 minutes",
    timeZone: "Etc/UTC",
    timeoutSeconds: 9 * 60,
    maxInstances: 1,
  },
  async () => {
    await reconciler.reconcile();
  },
);

module.exports = {
  processAccountDeletionTask,
  reconcileAccountDeletionJobs,
  requestAccountDeletion,
};
