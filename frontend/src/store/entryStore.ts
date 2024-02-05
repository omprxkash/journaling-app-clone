import { create } from 'zustand';
import type { Entry } from '../types/journal';
import { db } from '../db/dexie';

interface EntryState {
  entries: Entry[];
  selectedId: string | null;
  isLoading: boolean;
  setEntries: (entries: Entry[]) => void;
  selectEntry: (id: string | null) => void;
  addEntry: (entry: Entry) => void;
  updateEntry: (entry: Entry) => void;
  removeEntry: (id: string) => void;
  loadFromDexie: (userId: string) => Promise<void>;
}

export const useEntryStore = create<EntryState>((set) => ({
  entries: [],
  selectedId: null,
  isLoading: false,

  setEntries: (entries) => set({ entries }),
  selectEntry: (id) => set({ selectedId: id }),

  addEntry: (entry) =>
    set((s) => ({ entries: [entry, ...s.entries] })),

  updateEntry: (entry) =>
    set((s) => ({
      entries: s.entries.map((e) => (e.id === entry.id ? entry : e)),
    })),

  removeEntry: (id) =>
    set((s) => ({
      entries: s.entries.filter((e) => e.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  loadFromDexie: async (userId) => {
    set({ isLoading: true });
    try {
      const local = await db.entries
        .where('userId')
        .equals(userId)
        .reverse()
        .sortBy('createdAt');
      set({ entries: local as Entry[], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
