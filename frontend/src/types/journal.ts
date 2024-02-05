export type Mood = 'happy' | 'neutral' | 'sad' | 'anxious';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Entry {
  id: string;
  title: string;
  body: string;
  bodyPlain: string;
  mood?: Mood;
  wordCount: number;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  syncedAt?: string;
}

export interface LocalEntry extends Entry {
  userId: string;
  syncedAt?: string;
}

export interface SyncQueueItem {
  id?: number;
  entryId: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
  retryCount?: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
  wordCount: number;
}

export interface Stats {
  totalEntries: number;
  totalWords: number;
  streakDays: number;
  heatmap: HeatmapDay[];
}

export interface PaginatedEntries {
  entries: Entry[];
  total?: number;
  page: number;
  limit: number;
}
