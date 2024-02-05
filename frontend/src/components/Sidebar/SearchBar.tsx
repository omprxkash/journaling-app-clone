import { useSearch } from '../../hooks/useSearch';

export function SearchBar() {
  const { inputValue, setInputValue } = useSearch();

  return (
    <div className="px-3 py-2">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search entries..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-journal-500"
        />
        {inputValue && (
          <button
            onClick={() => setInputValue('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
