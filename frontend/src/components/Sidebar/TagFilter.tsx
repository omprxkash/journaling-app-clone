import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import { useUIStore } from '../../store/uiStore';

export function TagFilter() {
  const { user, activeTag, setActiveTag } = useUIStore();
  const tags = useLiveQuery(
    () => user ? db.tags.where('userId').equals(user.id).toArray() : [],
    [user?.id]
  ) ?? [];

  if (!tags.length) return (
    <div className="px-3 py-1 text-xs text-gray-400">No tags yet</div>
  );

  return (
    <div className="px-3 py-2 flex flex-wrap gap-1.5">
      <button
        onClick={() => setActiveTag(null)}
        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
          !activeTag
            ? 'bg-journal-500 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => setActiveTag(activeTag === tag.name ? null : tag.name)}
          className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
            activeTag === tag.name ? 'text-white' : 'text-gray-700 dark:text-gray-300'
          }`}
          style={{
            backgroundColor: activeTag === tag.name ? tag.color : undefined,
            border: `1px solid ${tag.color}`,
          }}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}
