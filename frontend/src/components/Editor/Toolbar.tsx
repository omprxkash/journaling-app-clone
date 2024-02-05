import type { Entry, Mood } from '../../types/journal';
import { db } from '../../db/dexie';

const MOODS: { value: Mood; label: string; emoji: string }[] = [
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'neutral', label: 'Neutral', emoji: '😐' },
  { value: 'sad', label: 'Sad', emoji: '😔' },
  { value: 'anxious', label: 'Anxious', emoji: '😰' },
];

interface Props {
  entry: Entry;
  onUpdate: (entry: Entry) => void;
}

export function Toolbar({ entry, onUpdate }: Props) {
  const handleMood = async (mood: Mood) => {
    const updated = { ...entry, mood, updatedAt: new Date().toISOString() };
    await db.entries.put(updated as never);
    onUpdate(updated);
  };

  const wordCount = entry.wordCount ?? 0;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="flex items-center gap-1">
        {MOODS.map((m) => (
          <button
            key={m.value}
            onClick={() => handleMood(m.value)}
            title={m.label}
            className={`p-1.5 rounded-md text-lg transition-all ${
              entry.mood === m.value
                ? 'bg-journal-100 dark:bg-journal-900 ring-1 ring-journal-500'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 opacity-50 hover:opacity-100'
            }`}
          >
            {m.emoji}
          </button>
        ))}
      </div>
      <div className="text-xs text-gray-400 tabular-nums">
        {wordCount} {wordCount === 1 ? 'word' : 'words'}
      </div>
    </div>
  );
}
