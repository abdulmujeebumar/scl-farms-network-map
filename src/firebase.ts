import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { FarmMapData } from './types';
import { initialData } from './data/initialData';

// ============================================================
// Firebase config — replace with your own from Firebase Console
// ============================================================
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: '000000000000',
  appId: 'YOUR_APP_ID',
};

const DOC_ID = 'scl-farms-map-data';

let db: ReturnType<typeof getFirestore> | null = null;

function getDb() {
  if (!db) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
  return db;
}

/** Save current data to Firestore */
export async function saveToCloud(data: FarmMapData): Promise<void> {
  try {
    const firestore = getDb();
    await setDoc(doc(firestore, 'map-data', DOC_ID), data);
  } catch {
    // Silently fail — localStorage is the fallback
  }
}

/** Load data from Firestore, or return null if unavailable */
export async function loadFromCloud(): Promise<FarmMapData | null> {
  try {
    const firestore = getDb();
    const snap = await getDoc(doc(firestore, 'map-data', DOC_ID));
    if (snap.exists()) {
      return snap.data() as FarmMapData;
    }
  } catch {
    // Silently fail
  }
  return null;
}

/** Subscribe to real-time updates from Firestore */
export function subscribeToCloud(
  callback: (data: FarmMapData) => void,
): () => void {
  try {
    const firestore = getDb();
    return onSnapshot(doc(firestore, 'map-data', DOC_ID), (snap) => {
      if (snap.exists()) {
        callback(snap.data() as FarmMapData);
      }
    });
  } catch {
    return () => {};
  }
}
