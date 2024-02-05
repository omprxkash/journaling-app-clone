import Dexie, { type Table } from 'dexie';
import type { LocalEntry, Tag, SyncQueueItem } from '../types/journal';

export class JournalDB extends Dexie {
  entries!: Table<LocalEntry>;
  tags!: Table<Tag>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('JournalDB');
    this.version(1).stores({
      entries: '++id, userId, createdAt, updatedAt, syncedAt, *tags',
      tags: '++id, name, userId',
      syncQueue: '++id, entryId, operation, timestamp',
    });
  }
}

export const db = new JournalDB();
