import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
} from 'firebase/auth';
import '../../firebase-auth-sdk.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';
import { getSharedFirebaseApp } from './firebase-app-client.js';

const { createFirebaseAuthSdk } = readLegacyNamespace(
  globalThis,
  'FirebaseAuthSdk',
  ['createFirebaseAuthSdk'],
);

function createModularAuthClient({ localStorage, resetStorageCaches }) {
  return createFirebaseAuthSdk({
    auth: getAuth(getSharedFirebaseApp()),
    sdk: {
      browserLocalPersistence,
      createUserWithEmailAndPassword,
      emailCredential: EmailAuthProvider.credential,
      reload,
      reauthenticateWithCredential,
      sendEmailVerification,
      sendPasswordResetEmail,
      setPersistence,
      signInWithEmailAndPassword,
      signOut,
      updateProfile,
      updatePassword,
    },
    localStorage,
    resetStorageCaches,
  });
}

export { createModularAuthClient };
