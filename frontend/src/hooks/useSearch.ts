import { useState, useEffect } from 'react';
import { useUIStore } from '../store/uiStore';

export function useSearch() {
  const { searchQuery, setSearchQuery } = useUIStore();
  const [inputValue, setInputValue] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue, setSearchQuery]);

  return { inputValue, setInputValue, searchQuery };
}
