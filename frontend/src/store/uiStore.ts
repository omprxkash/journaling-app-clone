import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  activeTag: string | null;
  searchQuery: string;
  user: { id: string; email: string } | null;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setActiveTag: (tag: string | null) => void;
  setSearchQuery: (q: string) => void;
  setUser: (user: { id: string; email: string } | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') ?? 'light',
  activeTag: null,
  searchQuery: '',
  user: (() => {
    try {
      const s = localStorage.getItem('user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  })(),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      return { theme: next };
    }),

  setActiveTag: (tag) => set({ activeTag: tag }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setUser: (user) => {
    try {
      if (user) localStorage.setItem('user', JSON.stringify(user));
      else localStorage.removeItem('user');
    } catch { /* storage may be unavailable in private browsing */ }
    set({ user });
  },
}));
