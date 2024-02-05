import { useState, useEffect } from 'react';
import { useUIStore } from './store/uiStore';
import { useEntryStore } from './store/entryStore';
import { useSync } from './hooks/useSync';
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';
import { SearchBar } from './components/Sidebar/SearchBar';
import { TagFilter } from './components/Sidebar/TagFilter';
import { EntryList } from './components/Sidebar/EntryList';
import { HeatmapCalendar } from './components/Calendar/HeatmapCalendar';
import { MarkdownEditor } from './components/Editor/MarkdownEditor';
import { Toolbar } from './components/Editor/Toolbar';
import { db } from './db/dexie';
import { authApi } from './api/client';
import type { Entry } from './types/journal';

function NewEntryButton({ onNew }: { onNew: () => void }) {
  return (
    <button
      onClick={onNew}
      className="mx-3 mb-2 flex items-center justify-center gap-1.5 w-[calc(100%-1.5rem)] py-1.5 text-sm font-medium text-white bg-journal-500 hover:bg-journal-600 rounded-lg transition-colors"
    >
      <span className="text-lg leading-none">+</span> New entry
    </button>
  );
}

export default function App() {
  const { user, setUser, theme, toggleTheme, sidebarOpen, toggleSidebar } = useUIStore();
  const { selectedId, selectEntry, updateEntry } = useEntryStore();
  const [showRegister, setShowRegister] = useState(false);

  useSync();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  if (!user) {
    return showRegister
      ? <RegisterForm onSwitch={() => setShowRegister(false)} />
      : <LoginForm onSwitch={() => setShowRegister(true)} />;
  }

  const selectedEntry = selectedId
    ? (db.entries.get(selectedId) as unknown as Entry | null)
    : null;

  const handleNew = async () => {
    const now = new Date().toISOString();
    const entry: Entry = {
      id: crypto.randomUUID(),
      title: '',
      body: '',
      bodyPlain: '',
      wordCount: 0,
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    await db.entries.add({ ...entry, userId: user.id } as never);
    await db.syncQueue.add({ entryId: entry.id, operation: 'create', timestamp: Date.now() });
    selectEntry(entry.id);
  };

  const handleLogout = async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-950">
      {sidebarOpen && (
        <aside className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-gray-800">
            <span className="font-semibold text-sm">Journal</span>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                title="Toggle theme"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-xs text-gray-500"
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          </div>
          <SearchBar />
          <TagFilter />
          <NewEntryButton onNew={handleNew} />
          <EntryList />
          <div className="border-t border-gray-200 dark:border-gray-800">
            <HeatmapCalendar />
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center px-3 py-2 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 mr-2"
            title="Toggle sidebar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <EntryTitleInput />
        </div>

        {selectedId ? (
          <SelectedEntryPanel
            entryId={selectedId}
            onUpdate={updateEntry}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-lg">Select an entry or create a new one</p>
              <button
                onClick={handleNew}
                className="mt-3 px-4 py-2 bg-journal-500 text-white rounded-lg text-sm hover:bg-journal-600 transition-colors"
              >
                New entry
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function EntryTitleInput() {
  const { selectedId } = useEntryStore();
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!selectedId) { setTitle(''); return; }
    db.entries.get(selectedId).then((e) => setTitle(e?.title ?? ''));
  }, [selectedId]);

  const handleChange = async (val: string) => {
    setTitle(val);
    if (!selectedId) return;
    const entry = await db.entries.get(selectedId);
    if (entry) {
      await db.entries.update(selectedId, { title: val, updatedAt: new Date().toISOString() });
    }
  };

  return (
    <input
      type="text"
      placeholder="Entry title…"
      value={title}
      onChange={(e) => handleChange(e.target.value)}
      disabled={!selectedId}
      className="flex-1 text-lg font-semibold bg-transparent focus:outline-none placeholder-gray-300 dark:placeholder-gray-700"
    />
  );
}

function SelectedEntryPanel({ entryId, onUpdate }: { entryId: string; onUpdate: (e: Entry) => void }) {
  const [entry, setEntry] = useState<Entry | null>(null);

  useEffect(() => {
    db.entries.get(entryId).then((e) => setEntry(e as Entry ?? null));
  }, [entryId]);

  if (!entry) return null;

  return (
    <>
      <Toolbar entry={entry} onUpdate={(e) => { setEntry(e); onUpdate(e); }} />
      <MarkdownEditor entry={entry} onSave={(e) => { setEntry(e); onUpdate(e); }} />
    </>
  );
}
