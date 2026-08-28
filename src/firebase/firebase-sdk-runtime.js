import { createModularAuthClient } from './firebase-auth-sdk.js';
import { createModularFirestoreRuntime } from './firebase-firestore-sdk.js';

/**
 * Builds the staged C28 SDK runtime with one account lifecycle shared by Auth
 * and Firestore. The active facade will adopt this composition only at the
 * coordinated cutover, when users perform the approved one-time login.
 */
function createModularFirebaseRuntime({
  localStorage = globalThis.localStorage,
  BroadcastChannelCtor = globalThis.BroadcastChannel,
} = {}) {
  let authClient = null;
  const firestoreRuntime = createModularFirestoreRuntime({
    getUid: () => authClient?.getUid() || null,
    localStorage,
    BroadcastChannelCtor,
  });
  authClient = createModularAuthClient({
    localStorage,
    resetStorageCaches: firestoreRuntime.client.resetStorageCaches,
    userLifecycle: firestoreRuntime.lifecycle,
  });
  return Object.freeze({
    auth: authClient,
    firestore: firestoreRuntime.client,
    lifecycle: firestoreRuntime.lifecycle,
  });
}

export { createModularFirebaseRuntime };
