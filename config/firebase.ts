import { mockHotlines, mockReports, mockBulletins, mockUsers } from '../data/mockData';

// Mock Firestore Wrapper to simulate Firebase without the SDK
class AdminFirestoreWrapper {
  collection(path: string) {
    let data: any[] = [];
    if (path === 'hotlines') data = mockHotlines;
    if (path === 'incident_reports') data = mockReports;
    if (path === 'bulletins') data = mockBulletins;
    if (path === 'users') data = mockUsers;
    
    return new CollectionWrapper(data);
  }
  batch() {
    return {
      set: () => {},
      update: () => {},
      delete: () => {},
      commit: async () => {}
    };
  }
}

class CollectionWrapper {
  constructor(private data: any[]) {}
  
  doc(id?: string) {
    const item = id ? this.data.find(d => d.id === id) : null;
    return new DocWrapper(item || { id: id || 'new-id' });
  }
  
  where(field: string, op: string, value: any) {
    const filtered = this.data.filter(d => {
      if (op === '==') return d[field] === value;
      if (op === '>=') return d[field] >= value;
      if (op === '<=') return d[field] <= value;
      return true;
    });
    return new CollectionWrapper(filtered);
  }
  
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    const sorted = [...this.data].sort((a, b) => {
      if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
      if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return new CollectionWrapper(sorted);
  }
  
  limit(n: number) {
    return new CollectionWrapper(this.data.slice(0, n));
  }
  
  async get() {
    return {
      docs: this.data.map(d => ({ id: d.id, data: () => d })),
      empty: this.data.length === 0,
      size: this.data.length
    };
  }
  
  async add(data: any) {
    const newDoc = { id: Math.random().toString(36).substr(2, 9), ...data };
    this.data.push(newDoc);
    return new DocWrapper(newDoc);
  }
  
  count() {
    return {
      get: async () => ({ data: () => ({ count: this.data.length }) })
    };
  }
}

class DocWrapper {
  constructor(private item: any) {}
  get ref() { return this; }
  
  async get() {
    return {
      id: this.item.id,
      exists: !!this.item.created_at || !!this.item.username,
      data: () => this.item
    };
  }
  
  async set(data: any) { Object.assign(this.item, data); }
  async update(data: any) { Object.assign(this.item, data); }
  async delete() { /* No-op for mock */ }
}

export const db = new AdminFirestoreWrapper() as any;
export const auth = {
  currentUser: null,
  onAuthStateChanged: (cb: any) => cb(null)
} as any;
