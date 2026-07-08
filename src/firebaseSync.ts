import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "./firebase";

// Helper to fetch a collection from Firestore
export async function fetchFirestoreCollection(collectionName: string): Promise<any[]> {
  try {
    const colRef = collection(db, collectionName);
    const querySnapshot = await getDocs(colRef);
    const items: any[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ ...doc.data(), id: doc.id });
    });
    return items;
  } catch (error) {
    console.error(`Error fetching collection ${collectionName} from Firestore:`, error);
    throw error;
  }
}

// Helper to save a single document in Firestore
export async function saveFirestoreDocument(collectionName: string, id: string, data: any): Promise<void> {
  try {
    const docRef = doc(db, collectionName, String(id));
    // Remove undefined properties to prevent Firestore crash
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    console.error(`Error saving document in ${collectionName}/${id}:`, error);
    throw error;
  }
}

// Helper to delete a single document in Firestore
export async function deleteFirestoreDocument(collectionName: string, id: string): Promise<void> {
  try {
    const docRef = doc(db, collectionName, String(id));
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}/${id}:`, error);
    throw error;
  }
}

// Batch save multiple documents to Firestore (useful for initial migration)
export async function saveCollectionBatch(collectionName: string, items: any[]): Promise<void> {
  if (!items || items.length === 0) return;
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const id = item.id || `item-${Math.random().toString(36).substring(2, 9)}`;
      const docRef = doc(db, collectionName, String(id));
      const cleanData = JSON.parse(JSON.stringify(item));
      batch.set(docRef, cleanData, { merge: true });
    });
    await batch.commit();
    console.log(`Successfully migrated ${items.length} items to ${collectionName}`);
  } catch (error) {
    console.error(`Failed to execute batch migration for ${collectionName}:`, error);
  }
}

// Automatic offline-to-cloud migration of all Barda databases
export async function migrateAllLocalStorageToFirestore(): Promise<void> {
  console.log("Starting automatic data migration to Firebase Firestore...");
  
  const migrations = [
    { key: 'barda_users', col: 'barda_users' },
    { key: 'barda_invitations', col: 'barda_invitations' },
    { key: 'barda_sales_orders', col: 'barda_sales_orders' },
    { key: 'barda_fixed_costs', col: 'barda_fixed_costs' },
    { key: 'barda_payments_ledger', col: 'barda_payments_ledger' },
    { key: 'barda_quotes_log', col: 'barda_quotes_log' },
    { key: 'barda_fabricacion_list', col: 'barda_fabricacion_list' }
  ];

  for (const m of migrations) {
    try {
      const localStr = localStorage.getItem(m.key);
      if (localStr) {
        const items = JSON.parse(localStr);
        if (Array.isArray(items) && items.length > 0) {
          // Check if firestore already has data for this collection
          const existing = await fetchFirestoreCollection(m.col);
          if (existing.length === 0) {
            console.log(`Firestore collection '${m.col}' is empty. Migrating ${items.length} local items...`);
            await saveCollectionBatch(m.col, items);
          } else {
            console.log(`Firestore collection '${m.col}' already has data. Skipping automatic migration.`);
          }
        }
      }
    } catch (err) {
      console.error(`Error migrating ${m.key}:`, err);
    }
  }

  // Handle key-value overrides (like barda_funnel_overrides)
  try {
    const funnelStr = localStorage.getItem('barda_funnel_overrides');
    if (funnelStr) {
      const funnelObj = JSON.parse(funnelStr);
      const existing = await fetchFirestoreCollection('barda_funnel_overrides');
      if (existing.length === 0) {
        const funnelList = Object.entries(funnelObj).map(([key, val]: [string, any]) => ({
          id: key,
          ...val
        }));
        if (funnelList.length > 0) {
          await saveCollectionBatch('barda_funnel_overrides', funnelList);
        }
      }
    }
  } catch (err) {
    console.error("Error migrating funnel overrides:", err);
  }

  console.log("Automatic database migration checking completed.");
}
