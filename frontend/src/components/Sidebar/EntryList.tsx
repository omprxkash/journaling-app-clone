import { format } from 'date-fns';
import { useEntries } from '../../hooks/useEntries';
import { useEntryStore } from '../../store/entryStore';
import type { Entry } from '../../types/journal';

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  neutral: '😐',
  sad: '😔',
  anxious: '😰',
};

function EntryItem({ entry, selected, onClick }: { entry: Entry; selected: boolean; onClick: () => void }) {
  const date = new Date(entry.createdAt);
  const preview = entry.bodyPlain?.slice(0, 80) || '';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors ${
        selected ? 'bg-journal-50 dark:bg-gray-900 border-l-2 border-l-journal-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm truncate flex-1">{entry.title || 'Untitled'}</span>
        {entry.mood && <span className="text-sm flex-shrink-0">{MOOD_EMOJI[entry.mood]}</span>}
      </div>
      <div className="text-xs text-gray-400 mt-0.5">{format(date, 'MMM d, yyyy')}</div>
      {preview && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{preview}</p>
      )}
      {entry.tags?.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap" aria-label="tags">
          {entry.tags.slice(0, 4).map((t) => (
            <span
              key={t.id}
              className="px-1.5 py-0 text-xs rounded-full"
              style={{ backgroundColor: t.color + '22', color: t.color }}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export function EntryList() {
  const { entries, isLoading } = useEntries();
  const { selectedId, selectEntry } = useEntryStore();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm px-4 text-center">
        No entries yet. Start writing!
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {entries.map((entry) => (
        <EntryItem
          key={entry.id}
          entry={entry}
          selected={selectedId === entry.id}
          onClick={() => selectEntry(entry.id)}
        />
      ))}
    </div>
  );
}
