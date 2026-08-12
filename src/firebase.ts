import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { FarmMapData } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyAHI95sN1B1hZ7sH6LLgMkY9R3wDyX9n3s",
  authDomain: "scl-farms-map.firebaseapp.com",
  projectId: "scl-farms-map",
  storageBucket: "scl-farms-map.firebasestorage.app",
  messagingSenderId: "570523982619",
  appId: "1:570523982619:web:8d99339b878edc2943d1be"
};

const DOC_ID = 'scl-farms-map-data';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/** Save current data to Firestore */
export async function saveToCloud(data: FarmMapData): Promise<void> {
  try {
    await setDoc(doc(db, 'map-data', DOC_ID), data);
  } catch { /* localStorage fallback */ }
}

/** Load data from Firestore, or return null if unavailable */
export async function loadFromCloud(): Promise<FarmMapData | null> {
  try {
    const snap = await getDoc(doc(db, 'map-data', DOC_ID));
    if (snap.exists()) return snap.data() as FarmMapData;
  } catch { /* offline fallback */ }
  return null;
}

/** Subscribe to real-time updates from Firestore */
export function subscribeToCloud(
  callback: (data: FarmMapData) => void,
): () => void {
  return onSnapshot(doc(db, 'map-data', DOC_ID), (snap) => {
    if (snap.exists()) callback(snap.data() as FarmMapData);
  });
}
