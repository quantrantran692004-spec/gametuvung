// IndexedDB Local-First Database Wrapper
const DB_NAME = 'word_shooter_db';
const DB_VERSION = 1;

class DB {
  constructor() {
    this.db = null;
    this.memory = new Map();
    this.usingFallback = false;
  }

  async init() {
    if (!('indexedDB' in window)) {
      this.usingFallback = true;
      return null;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Profiles Store
        if (!db.objectStoreNames.contains('profiles')) {
          const profileStore = db.createObjectStore('profiles', { keyPath: 'id' });
          profileStore.createIndex('name', 'name', { unique: false });
        }

        // Vocabulary Store
        if (!db.objectStoreNames.contains('vocabulary')) {
          const vocabStore = db.createObjectStore('vocabulary', { keyPath: 'id' });
          vocabStore.createIndex('english', 'english', { unique: false });
          vocabStore.createIndex('unit', 'unit', { unique: false });
          vocabStore.createIndex('masteryLevel', 'masteryLevel', { unique: false });
          vocabStore.createIndex('isFavorite', 'isFavorite', { unique: false });
          vocabStore.createIndex('needsReview', 'needsReview', { unique: false });
        }

        // Game Sessions Store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('profileId', 'profileId', { unique: false });
          sessionStore.createIndex('playedAt', 'playedAt', { unique: false });
        }

        // Trash / Soft Deletion Store
        if (!db.objectStoreNames.contains('trash')) {
          db.createObjectStore('trash', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        this.usingFallback = true;
        resolve(null);
      };

      request.onblocked = () => {
        this.usingFallback = true;
        resolve(null);
      };
    });
  }

  async getAll(storeName) {
    if (this.usingFallback) return [...(this.memory.get(storeName)?.values() || [])];
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async get(storeName, key) {
    if (this.usingFallback) return this.memory.get(storeName)?.get(key);
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async put(storeName, item) {
    if (this.usingFallback) {
      if (!this.memory.has(storeName)) this.memory.set(storeName, new Map());
      this.memory.get(storeName).set(item.id, item);
      return item.id;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async delete(storeName, key) {
    if (this.usingFallback) {
      this.memory.get(storeName)?.delete(key);
      return undefined;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async count(storeName) {
    if (this.usingFallback) return this.memory.get(storeName)?.size || 0;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}

export const db = new DB();
