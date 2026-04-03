import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  limit, 
  orderBy, 
  getCountFromServer,
  writeBatch,
  DocumentReference,
  CollectionReference,
  Query,
  QuerySnapshot
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json' assert { type: 'json' };

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Mimic Admin SDK API to minimize changes in controllers
class AdminFirestoreWrapper {
  collection(path: string) {
    return new CollectionWrapper(collection(firestore, path));
  }
  batch() {
    const batch = writeBatch(firestore);
    return {
      set: (docRef: any, data: any) => batch.set(docRef.ref, data),
      update: (docRef: any, data: any) => batch.update(docRef.ref, data),
      delete: (docRef: any) => batch.delete(docRef.ref),
      commit: () => batch.commit()
    };
  }
}

class CollectionWrapper {
  constructor(private ref: CollectionReference) {}
  
  doc(id?: string) {
    return new DocWrapper(id ? doc(this.ref, id) : doc(this.ref));
  }
  
  where(field: string, op: any, value: any) {
    return new QueryWrapper(query(this.ref, where(field, op, value)));
  }
  
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    return new QueryWrapper(query(this.ref, orderBy(field, direction)));
  }
  
  limit(n: number) {
    return new QueryWrapper(query(this.ref, limit(n)));
  }
  
  async get() {
    const snap = await getDocs(this.ref);
    return new QuerySnapshotWrapper(snap);
  }
  
  async add(data: any) {
    const docRef = await addDoc(this.ref, data);
    return new DocWrapper(docRef);
  }
  
  count() {
    return {
      get: async () => {
        const snap = await getCountFromServer(this.ref);
        return { data: () => ({ count: snap.data().count }) };
      }
    };
  }
}

class QueryWrapper {
  constructor(private q: Query) {}
  
  where(field: string, op: any, value: any) {
    return new QueryWrapper(query(this.q, where(field, op, value)));
  }
  
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    return new QueryWrapper(query(this.q, orderBy(field, direction)));
  }
  
  limit(n: number) {
    return new QueryWrapper(query(this.q, limit(n)));
  }
  
  async get() {
    const snap = await getDocs(this.q);
    return new QuerySnapshotWrapper(snap);
  }
  
  count() {
    return {
      get: async () => {
        const snap = await getCountFromServer(this.q);
        return { data: () => ({ count: snap.data().count }) };
      }
    };
  }
}

class DocWrapper {
  constructor(public ref: DocumentReference) {}
  
  async get() {
    const snap = await getDoc(this.ref);
    return {
      id: snap.id,
      exists: snap.exists(),
      data: () => snap.data()
    };
  }
  
  async set(data: any) {
    await setDoc(this.ref, data);
  }
  
  async update(data: any) {
    await updateDoc(this.ref, data);
  }
  
  async delete() {
    await deleteDoc(this.ref);
  }
}

class QuerySnapshotWrapper {
  constructor(private snap: QuerySnapshot) {}
  get docs() {
    return this.snap.docs.map(d => ({
      id: d.id,
      data: () => d.data()
    }));
  }
  get empty() {
    return this.snap.empty;
  }
  get size() {
    return this.snap.size;
  }
}

export const db = new AdminFirestoreWrapper() as any;
export const auth = getAuth(app);
