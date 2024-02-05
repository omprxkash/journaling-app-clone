import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/dexie';
import { useUIStore } from '../store/uiStore';
import type { Entry } from '../types/journal';

export function useEntries(): { entries: Entry[]; isLoading: boolean } {
  const { user, activeTag, searchQuery } = useUIStore();

  const entries = useLiveQuery(async () => {
    if (!user) return [];

    let collection = db.entries.where('userId').equals(user.id);

    const all = await collection.reverse().sortBy('createdAt') as Entry[];

    let filtered = all.filter((e) => !e.deletedAt);

    if (activeTag) {
      filtered = filtered.filter((e) =>
        e.tags?.some((t) => t.name === activeTag)
      );
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.bodyPlain?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [user?.id, activeTag, searchQuery]);

  return { entries: entries ?? [], isLoading: entries === undefined };
}
