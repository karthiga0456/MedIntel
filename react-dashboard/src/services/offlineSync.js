import localforage from 'localforage';
import { api } from './api';

localforage.config({
  name: 'MedIntelDB',
  storeName: 'offline_sync_store',
});

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'offline-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

class OfflineSyncService {
  constructor() {
    this.listeners = new Set();
    this.status = navigator.onLine ? 'ONLINE' : 'OFFLINE'; // ONLINE, OFFLINE, SYNCING, SYNCED, SYNC ERROR
    this.lastSyncTime = null;
    this.isSyncing = false;

    // Listen to network changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.setStatus('ONLINE');
        this.syncQueue();
      });
      window.addEventListener('offline', () => {
        this.setStatus('OFFLINE');
      });
    }

    // Load last sync timestamp from local storage
    if (typeof localStorage !== 'undefined') {
      this.lastSyncTime = localStorage.getItem('medintel_last_sync');
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener({ status: this.status, lastSyncTime: this.lastSyncTime });
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener({ status: this.status, lastSyncTime: this.lastSyncTime });
    }
  }

  setStatus(newStatus) {
    this.status = newStatus;
    this.notify();
  }

  async getQueue() {
    const queue = await localforage.getItem('sync_queue');
    return queue || [];
  }

  async getFailedQueue() {
    const failed = await localforage.getItem('failed_sync_queue');
    return failed || [];
  }

  async queueOperation(entityType, payload) {
    const queue = await this.getQueue();
    const item = {
      client_uuid: generateUUID(),
      entity_type: entityType, // 'health_record', 'patient', 'field_visit', 'vaccination'
      payload,
      timestamp: new Date().toISOString(),
      retry_count: 0,
    };

    queue.push(item);
    await localforage.setItem('sync_queue', queue);

    // If online, immediately attempt sync
    if (navigator.onLine && !this.isSyncing) {
      this.syncQueue();
    } else {
      this.setStatus('OFFLINE');
    }

    return item;
  }

  async queueRecord(recordData) {
    return this.queueOperation('health_record', recordData);
  }

  async syncQueue() {
    if (!navigator.onLine) {
      this.setStatus('OFFLINE');
      return;
    }

    if (this.isSyncing) return;

    const queue = await this.getQueue();
    if (queue.length === 0) {
      this.setStatus('ONLINE');
      return;
    }

    this.isSyncing = true;
    this.setStatus('SYNCING');

    try {
      // Use batch endpoint on backend
      const response = await api.sync.batch(queue);
      const syncedUuids = new Set(response.synced_uuids || []);

      // Filter remaining un-synced or failed
      const remainingQueue = queue.filter((item) => !syncedUuids.has(item.client_uuid));

      if (response.errors && response.errors.length > 0) {
        const failedQueue = await this.getFailedQueue();
        failedQueue.push(...response.errors);
        await localforage.setItem('failed_sync_queue', failedQueue);
      }

      await localforage.setItem('sync_queue', remainingQueue);

      this.lastSyncTime = new Date().toLocaleTimeString();
      localStorage.setItem('medintel_last_sync', this.lastSyncTime);

      if (remainingQueue.length > 0) {
        this.setStatus('SYNC ERROR');
      } else {
        this.setStatus('SYNCED');
        setTimeout(() => {
          if (navigator.onLine) this.setStatus('ONLINE');
        }, 3000);
      }
    } catch (err) {
      console.error('Batch sync encountered network failure:', err);
      this.setStatus('SYNC ERROR');
    } finally {
      this.isSyncing = false;
    }
  }

  async retryFailed() {
    const failed = await this.getFailedQueue();
    if (failed.length === 0) return;

    const queue = await this.getQueue();
    queue.push(...failed);
    await localforage.setItem('sync_queue', queue);
    await localforage.setItem('failed_sync_queue', []);
    return this.syncQueue();
  }
}

export const offlineSync = new OfflineSyncService();
