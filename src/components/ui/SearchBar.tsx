/**
 * Search bar component for globe entity search
 * TODO: Implement search with autocomplete and entity filtering
 */

'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  distance?: number;
}

/**
 * TODO: Implement search functionality
 */
export function SearchBar() {
  const [query, setQuery] = React.useState('');
  const [results] = React.useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSearch = React.useCallback((text: string) => {
    setQuery(text);
    if (text.length > 0) {
      // TODO: Implement search logic
      // TODO: Query globe for matching entities
      // TODO: Filter by type and distance
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, []);

  const handleSelectResult = React.useCallback((_result: SearchResult) => {
    // TODO: Center globe on result
    // TODO: Select entity in detail panel
    setQuery('');
    setIsOpen(false);
  }, []);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-space-accent/50" />
        <input
          type="text"
          placeholder="Search satellites, launches, targets..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query && setIsOpen(true)}
          className="w-full pl-10 pr-4 py-2 bg-space-dark/50 border border-space-accent/30 rounded-lg outline-none focus:border-space-accent/80 text-sm transition-colors placeholder-gray-500"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-80"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* TODO: Implement search results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-space-dark/90 border border-space-accent/30 rounded-lg overflow-hidden z-50">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelectResult(result)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-space-accent/10 border-b border-space-accent/10 last:border-b-0 transition-colors"
            >
              <div className="font-medium">{result.name}</div>
              <div className="text-xs text-gray-400">{result.type}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
