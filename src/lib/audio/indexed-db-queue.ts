const DB_NAME = 'sutradhar_audio_buffer';
const DB_VERSION = 1;
const STORE_NAME = 'chunks';

export interface BufferedChunk {
  interviewId: string;
  chunkIndex: number;
  blob: Blob;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: ['interviewId', 'chunkIndex'] });
        store.createIndex('interviewId', 'interviewId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function bufferChunk(interviewId: string, chunkIndex: number, blob: Blob): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item: BufferedChunk = {
      interviewId,
      chunkIndex,
      blob,
      createdAt: Date.now(),
    };
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getBufferedChunks(interviewId: string): Promise<BufferedChunk[]> {
  const db = await openDB();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('interviewId');
    const req = index.getAll(interviewId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function clearBufferedChunk(interviewId: string, chunkIndex: number): Promise<void> {
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete([interviewId, chunkIndex]);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
