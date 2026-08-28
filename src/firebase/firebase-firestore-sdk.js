import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
} from 'firebase/firestore';
import '../../firebase-firestore-sdk.js';
import { readLegacyNamespace } from '../leaf/read-legacy-namespace.js';
import { getSharedFirebaseApp } from './firebase-app-client.js';

const { createFirebaseFirestoreSdk } = readLegacyNamespace(
  globalThis,
  'FirebaseFirestoreSdk',
  ['createFirebaseFirestoreSdk'],
);

function createModularFirestoreClient({getUid}) {
  return createFirebaseFirestoreSdk({
    firestore: getFirestore(getSharedFirebaseApp()),
    getUid,
    sdk: {
      collection,
      deleteDoc,
      deleteField,
      doc,
      getDoc,
      getDocs,
      setDoc,
    },
  });
}

export { createFirebaseFirestoreSdk, createModularFirestoreClient };
