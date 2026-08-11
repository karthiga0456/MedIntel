import localforage from 'localforage';
import { api } from './api';

localforage.config({
  name: 'MedIntel',
  storeName: 'health_records_queue'
});

class OfflineSyncService {
  async queueRecord(recordData) {
    const queue = await this.getQueue();
    // Add unique internal ID for tracking in queue
    const item = {
      _queue_id: Date.now().toString() + Math.random().toString(36).substring(2),
      timestamp: new Date().toISOString(),
      ...recordData
    };
    queue.push(item);
    await localforage.setItem('sync_queue', queue);
    return item;
  }

  async getQueue() {
    const queue = await localforage.getItem('sync_queue');
    return queue || [];
  }

  async clearQueue() {
    await localforage.setItem('sync_queue', []);
  }

  async syncQueue() {
    if (!navigator.onLine) {
      console.log("OfflineSync: Cannot sync, currently offline.");
      return;
    }

    const queue = await this.getQueue();
    if (queue.length === 0) return;

    console.log(`OfflineSync: Found ${queue.length} items to sync.`);

    let successfulSyncs = [];
    
    // Attempt to sync each record
    for (const item of queue) {
      try {
        // Strip out the internal queue ID before sending to backend
        const { _queue_id, timestamp, ...payload } = item;
        await api.worker.submitRecord(payload);
        successfulSyncs.push(_queue_id);
      } catch (error) {
        console.error("OfflineSync: Failed to sync item", item, error);
        // Break early if we hit an error, network might be flaky again
        break;
      }
    }

    // Remove successful syncs from queue
    if (successfulSyncs.length > 0) {
      const remainingQueue = queue.filter(item => !successfulSyncs.includes(item._queue_id));
      await localforage.setItem('sync_queue', remainingQueue);
      console.log(`OfflineSync: Synced ${successfulSyncs.length} items. ${remainingQueue.length} remaining.`);
    }
  }
}

export const offlineSync = new OfflineSyncService();
