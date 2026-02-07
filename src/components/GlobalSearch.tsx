'use client';

import { useState } from 'react';

interface SearchResult {
  file: string;
  line: number;
  content: string;
  context: string;
  score: number;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || query.length < 2) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=50`);
      const data = await res.json();
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setLoading(false);
  }

  function highlightQuery(text: string): React.ReactNode {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded">{part}</mark>
        : part
    );
  }

  function getFileIcon(file: string): string {
    if (file.includes('MEMORY')) return '🧠';
    if (file.includes('memory/')) return '📝';
    if (file.includes('projects/')) return '📁';
    if (file.includes('runbooks/')) return '📋';
    if (file.includes('SOUL')) return '💫';
    if (file.includes('USER')) return '👤';
    if (file.includes('TOOLS')) return '🔧';
    if (file.includes('AGENTS')) return '🤖';
    return '📄';
  }

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Global Search</h2>
        <p className="text-sm text-gray-400 mb-4">
          Search through all memories, documents, and workspace files
        </p>
        
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for anything... (e.g., 'TEAS platform', 'API key', 'Edward preferences')"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setSearched(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || query.length < 2}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition-colors"
          >
            {loading ? '...' : '🔍 Search'}
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-4" style={{ minHeight: '400px' }}>
        {/* Results List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-700 bg-gray-750">
            <span className="text-sm text-gray-400">
              {searched 
                ? `${results.length} results${total > results.length ? ` (showing ${results.length} of ${total})` : ''}`
                : 'Enter a search term to begin'
              }
            </span>
          </div>
          
          <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full mb-2"></div>
                <p>Searching...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                {searched ? (
                  <>
                    <p className="text-4xl mb-2">🔍</p>
                    <p>No results found for "{query}"</p>
                    <p className="text-sm mt-2">Try different keywords</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl mb-2">💡</p>
                    <p>Search through Cara's memories</p>
                    <p className="text-sm mt-2">Find past conversations, decisions, and notes</p>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {results.map((result, idx) => (
                  <button
                    key={`${result.file}-${result.line}-${idx}`}
                    onClick={() => setSelectedResult(result)}
                    className={`w-full p-3 text-left hover:bg-gray-700/50 transition-colors ${
                      selectedResult === result ? 'bg-gray-700' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{getFileIcon(result.file)}</span>
                      <span className="text-sm font-medium text-blue-400 truncate">{result.file}</span>
                      <span className="text-xs text-gray-500">:{result.line}</span>
                    </div>
                    <p className="text-sm text-gray-300 truncate">
                      {highlightQuery(result.content)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-700 rounded-full h-1">
                        <div 
                          className="bg-green-500 rounded-full h-1" 
                          style={{ width: `${Math.min(result.score * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{Math.round(result.score * 100)}%</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Context Preview */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-700 bg-gray-750">
            <span className="text-sm text-gray-400">
              {selectedResult ? `Preview: ${selectedResult.file}` : 'Select a result to preview'}
            </span>
          </div>
          
          <div className="p-4 overflow-y-auto" style={{ maxHeight: '500px' }}>
            {selectedResult ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{getFileIcon(selectedResult.file)}</span>
                  <div>
                    <h3 className="font-medium">{selectedResult.file}</h3>
                    <p className="text-sm text-gray-400">Line {selectedResult.line}</p>
                  </div>
                </div>
                
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                  {selectedResult.context.split('\n').map((line, i) => (
                    <div key={i} className={line.includes(selectedResult.content.trim()) ? 'bg-yellow-500/10 -mx-3 px-3' : ''}>
                      {highlightQuery(line)}
                    </div>
                  ))}
                </pre>
                
                <div className="mt-3 text-xs text-gray-500">
                  Match score: {Math.round(selectedResult.score * 100)}%
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-4xl mb-2">📖</p>
                  <p>Click a result to see context</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
