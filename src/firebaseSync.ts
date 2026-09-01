import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";
import { auth, db } from "./firebase";

// Real-time listener for any Firestore collection
export function subscribeToFirestoreCollection(
  collectionName: string,
  onData: (items: any[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  try {
    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...docSnap.data(), id: docSnap.id });
        });
        onData(items);
      },
      (error) => {
        // Silently capture permission errors when client is offline or initializing
        if (error?.code === 'permission-denied') {
          console.info(`[Sync] Real-time listener for '${collectionName}' waiting for active auth credentials.`);
        } else {
          console.warn(`Firestore real-time subscription note for ${collectionName}:`, error);
        }
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn(`Could not set up subscription for ${collectionName}:`, error);
    return () => {};
  }
}

// Helper to fetch a collection from Firestore once
export async function fetchFirestoreCollection(collectionName: string): Promise<any[]> {
  try {
    const colRef = collection(db, collectionName);
    const querySnapshot = await getDocs(colRef);
    const items: any[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ ...doc.data(), id: doc.id });
    });
    return items;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.info(`[Sync] Collection '${collectionName}' read restricted until user authentication is verified.`);
    } else {
      console.warn(`Firestore collection ${collectionName} unavailable (offline or network error):`, error);
    }
    return [];
  }
}

// Helper to save a single document in Firestore
export async function saveFirestoreDocument(collectionName: string, idOrData: string | any, data?: any): Promise<void> {
  try {
    let docId: string;
    let docData: any;
    if (typeof idOrData === 'string') {
      docId = idOrData;
      docData = data;
    } else {
      docId = String(idOrData.id || idOrData.orderNum || Date.now());
      docData = idOrData;
    }
    const docRef = doc(db, collectionName, String(docId));
    // Remove undefined properties to prevent Firestore crash
    const cleanData = JSON.parse(JSON.stringify(docData || {}));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.info(`[Sync] Firestore save for '${collectionName}' operating locally (waiting for auth).`);
    } else {
      console.warn(`Firestore save note for ${collectionName}:`, error);
    }
  }
}

// Helper to delete a single document in Firestore
export async function deleteFirestoreDocument(collectionName: string, id: string): Promise<void> {
  try {
    const docRef = doc(db, collectionName, String(id));
    await deleteDoc(docRef);
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      console.info(`[Sync] Firestore delete for '${collectionName}' deferred.`);
    } else {
      console.warn(`Firestore delete note for ${collectionName}/${id}:`, error);
    }
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
    console.log(`Successfully synced ${items.length} items to ${collectionName}`);
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      console.info(`[Sync] Batch sync for '${collectionName}' deferred (authenticating session).`);
    } else {
      console.warn(`Note on batch sync for ${collectionName}:`, error);
    }
  }
}

// Default sale template for reference and seed
export const JULIETA_VERA_ORDER = {
  id: 'pe-1005-julieta-vera',
  orderNum: 'PE-1005',
  date: '2026-08-31',
  client: {
    nombre: 'Julieta Vera',
    telefono: '2994617190',
    cuit: '',
    direccion: 'Neuquén Capital',
    cp: '8300',
    ciudad: 'Neuquén',
    provincia: 'Neuquén'
  },
  items: [
    {
      name: 'Set Comedor Mesa + Sillas',
      nombre: 'Set Comedor Mesa + Sillas',
      category: 'Sillas, Mesas',
      categoria: 'Sillas, Mesas',
      qty: 1,
      price: 1932480,
      detail: 'Juego de Comedor Petiribí'
    }
  ],
  subtotal: 1932480,
  discount: 0,
  total: 1932480,
  totalCost: 1150000,
  profit: 782480,
  paymentMethod: 'Transferencia Bancaria',
  status: 'Pendiente',
  paymentStatus: 'Señado',
  senaAmount: 360000,
  deliveryDate: '2026-09-30',
  notes: 'Entrega en Septiembre 2026',
  attachments: []
};

// Automatic offline-to-cloud migration and delta sync of all Barda databases
export async function migrateAllLocalStorageToFirestore(): Promise<void> {
  console.log("Checking and syncing local data to Firebase Firestore...");
  
  const migrations = [
    { key: 'barda_users', col: 'barda_users' },
    { key: 'barda_invitations', col: 'barda_invitations' },
    { key: 'barda_sales_orders', col: 'barda_sales_orders' },
    { key: 'barda_fixed_costs', col: 'barda_fixed_costs' },
    { key: 'barda_payments_ledger', col: 'barda_payments_ledger' },
    { key: 'barda_quotes_log', col: 'barda_quotes_log' },
    { key: 'barda_fabricacion_list', col: 'barda_fabricacion_list' },
    { key: 'barda_stock_items', col: 'barda_stock_items' },
    { key: 'barda_stock_movements', col: 'barda_stock_movements' }
  ];

  for (const m of migrations) {
    try {
      const localStr = localStorage.getItem(m.key);
      let items: any[] = [];
      if (localStr) {
        try {
          const parsed = JSON.parse(localStr);
          if (Array.isArray(parsed)) items = parsed;
        } catch {}
      }

      // If checking sales orders, ensure standard orders and Julieta Vera exist
      if (m.col === 'barda_sales_orders') {
        const hasVera = items.some(it => (it.client?.nombre || '').toLowerCase().includes('vera') || it.orderNum === 'PE-1005');
        if (!hasVera) {
          items = [JULIETA_VERA_ORDER, ...items];
          localStorage.setItem('barda_sales_orders', JSON.stringify(items));
        }
      }

      if (items.length > 0) {
        // Fetch existing data from Firestore to detect unsynced delta records
        const existing = await fetchFirestoreCollection(m.col);
        const existingIds = new Set(existing.map((e: any) => String(e.id || e.orderNum || '')));
        
        const missingInFirestore = items.filter((item: any) => {
          const id = String(item.id || item.orderNum || '');
          return id && !existingIds.has(id);
        });

        if (missingInFirestore.length > 0) {
          console.log(`Uploading ${missingInFirestore.length} unsynced local items to '${m.col}'...`);
          await saveCollectionBatch(m.col, missingInFirestore);
        }
      }
    } catch (err) {
      console.warn(`Note syncing ${m.key}:`, err);
    }
  }

  // Handle key-value overrides (like barda_funnel_overrides)
  try {
    const funnelStr = localStorage.getItem('barda_funnel_overrides');
    if (funnelStr) {
      const funnelObj = JSON.parse(funnelStr);
      const existing = await fetchFirestoreCollection('barda_funnel_overrides');
      const existingIds = new Set(existing.map((e: any) => String(e.id || '')));
      const funnelList = Object.entries(funnelObj).map(([key, val]: [string, any]) => ({
        id: key,
        ...val
      }));
      const missingFunnel = funnelList.filter(item => !existingIds.has(String(item.id)));
      if (missingFunnel.length > 0) {
        await saveCollectionBatch('barda_funnel_overrides', missingFunnel);
      }
    }
  } catch (err) {
    console.warn("Note syncing funnel overrides:", err);
  }

  console.log("Automatic database synchronization checking completed.");
}
