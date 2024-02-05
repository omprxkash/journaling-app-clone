import { useEffect, useRef } from 'react';
import { db } from '../db/dexie';
import { entriesApi } from '../api/client';
import { useUIStore } from '../store/uiStore';
import type { Entry } from '../types/journal';

const SYNC_KEY = 'lastSyncAt';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function useSync() {
  const { user } = useUIStore();
  const running = useRef(false);

  useEffect(() => {
    if (!user || running.current) return;
    running.current = true;

    (async () => {
      try {
        const lastSync = localStorage.getItem(SYNC_KEY);
        const params: Record<string, string> = lastSync ? { from: lastSync } : {};

        const { data } = await entriesApi.list(params);
        const now = new Date().toISOString();

        for (const remote of data.entries) {
          const local = await db.entries.get(remote.id);
          if (!local || new Date(remote.updatedAt) > new Date(local.updatedAt ?? 0)) {
            await db.entries.put({ ...remote, userId: user.id, syncedAt: now } as never);
          }
        }
        localStorage.setItem(SYNC_KEY, now);

        const queue = await db.syncQueue.orderBy('timestamp').toArray();
        for (const item of queue) {
          let retries = item.retryCount ?? 0;
          while (retries < 5) {
            try {
              const entry = await db.entries.get(item.entryId);
              if (item.operation === 'delete') {
                await entriesApi.delete(item.entryId);
              } else if (entry) {
                if (item.operation === 'create') {
                  await entriesApi.create({
                    title: entry.title,
                    body: entry.body,
                    tags: entry.tags?.map((t) => t.name) ?? [],
                    mood: entry.mood,
                  });
                } else {
                  await entriesApi.update(item.entryId, {
                    title: entry.title,
                    body: entry.body,
                    tags: entry.tags?.map((t) => t.name) ?? [],
                    mood: entry.mood,
                  });
                }
              }
              if (item.id !== undefined) await db.syncQueue.delete(item.id);
              break;
            } catch {
              retries++;
              if (item.id !== undefined) {
                await db.syncQueue.update(item.id, { retryCount: retries });
              }
              await sleep(Math.pow(2, retries) * 1000);
            }
          }
        }
      } catch {
        // offline — will retry next mount
      } finally {
        running.current = false;
      }
    })();
  }, [user]);
}

