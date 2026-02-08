'use client';

import { useState, useEffect, useCallback } from 'react';

interface Session {
  key: string;
  kind: string;
  channel: string;
  displayName: string;
  model: string;
  totalTokens: number;
  contextTokens: number;
  updatedAt: number;
  lastMessage?: string;
  currentTask?: string;
  sessionId: string;
  abortedLastRun?: boolean;
}

interface SessionData {
  sessions: Session[];
  lastUpdated: string | null;
  live?: boolean;
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

function getChannelIcon(channel: string): string {
  const icons: Record<string, string> = {
    telegram: '📱',
    discord: '💬',
    slack: '💼',
    signal: '🔐',
    imessage: '💬',
  };
  return icons[channel] || '📡';
}

function getKindColor(kind: string): string {
  const colors: Record<string, string> = {
    group: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    dm: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  return colors[kind] || colors.other;
}

// Tab version (inline in page)
export default function SessionSnapshotTab({ autoRefresh = true }: { autoRefresh?: boolean }) {
  const [data, setData] = useState<SessionData>({ sessions: [], lastUpdated: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try live endpoint first, falls back to static internally
      const res = await fetch('/api/live-sessions');
      const json = await res.json();
      setData(json);
    } catch (err) {
      // Fallback to static endpoint
      try {
        const res = await fetch('/api/sessions');
        const json = await res.json();
        setData({ ...json, live: false });
      } catch {
        setError('Failed to fetch sessions');
        console.error(err);
      }
    }
    setLoading(false);
    setInitialLoad(false);
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <div>
      {/* Header with refresh */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-400">
            {data.live ? (
              <span className="text-green-400">🟢 Live data • Updated {data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : 'now'}</span>
            ) : data.lastUpdated ? (
              <span>📁 Static • {new Date(data.lastUpdated).toLocaleString()}</span>
            ) : (
              'Loading...'
            )}
          </p>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          <span className={loading ? 'animate-spin' : ''}>↻</span>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Content */}
      {initialLoad && loading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin inline-block w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full mb-3"></div>
          <p>Loading sessions...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">
          <p className="text-4xl mb-2">⚠️</p>
          <p>{error}</p>
        </div>
      ) : data.sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📭</p>
          <p>No active sessions</p>
          <p className="text-sm mt-2">Sessions will appear here when synced from OpenClaw</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          {(() => {
            const totalTokens = data.sessions.reduce((sum, s) => sum + s.totalTokens, 0);
            const totalContext = data.sessions.reduce((sum, s) => sum + (s.contextTokens || 200000), 0);
            const avgUsage = totalTokens / totalContext;
            const abortedCount = data.sessions.filter(s => s.abortedLastRun).length;
            
            return (
              <div className="flex gap-4 mb-4 text-sm flex-wrap">
                <div className="bg-gray-800 px-4 py-2 rounded-lg">
                  <span className="text-gray-400">Sessions:</span>{' '}
                  <span className="text-white font-medium">{data.sessions.length}</span>
                </div>
                <div className="bg-gray-800 px-4 py-2 rounded-lg">
                  <span className="text-gray-400">Total Tokens:</span>{' '}
                  <span className="text-white font-medium">{(totalTokens / 1000).toFixed(1)}k</span>
                </div>
                <div className="bg-gray-800 px-4 py-2 rounded-lg">
                  <span className="text-gray-400">Avg Context:</span>{' '}
                  <span className={`font-medium ${avgUsage > 0.7 ? 'text-red-400' : avgUsage > 0.5 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {(avgUsage * 100).toFixed(0)}%
                  </span>
                </div>
                {abortedCount > 0 && (
                  <div className="bg-red-900/30 px-4 py-2 rounded-lg border border-red-700/50">
                    <span className="text-red-400">⚠️ {abortedCount} aborted</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Sessions Grid */}
          <div className="space-y-3">
            {data.sessions.map((session) => (
              <div
                key={session.key}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Channel Icon */}
                    <div className="text-2xl">{getChannelIcon(session.channel)}</div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{session.displayName}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${getKindColor(session.kind)}`}>
                          {session.kind}
                        </span>
                        <span className="text-xs text-gray-500">{session.channel}</span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Model: <span className="text-gray-300">{session.model}</span>
                      </div>
                      
                      {/* Current Task - Prominently displayed */}
                      {session.currentTask && (
                        <div className="mt-3 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                          <div className="text-xs text-blue-400 font-medium mb-1">🔧 Working on:</div>
                          <div className="text-sm text-gray-200">{session.currentTask}</div>
                        </div>
                      )}
                      
                      {/* Last Message / Current Context */}
                      {session.lastMessage && (
                        <div className="mt-2 p-2 bg-gray-700/30 rounded-lg">
                          <span className="text-gray-500 text-xs">Last request:</span>
                          <p className="text-gray-300 text-sm mt-1">{session.lastMessage}</p>
                        </div>
                      )}
                      
                      {/* Status indicator based on recent activity */}
                      {!session.currentTask && (
                        <div className="mt-2 text-sm">
                          {(() => {
                            const now = Date.now();
                            const diffMs = now - session.updatedAt;
                            const diffSecs = Math.floor(diffMs / 1000);
                            
                            if (diffSecs < 60) {
                              return <span className="text-green-400 font-medium">🟢 Active now</span>;
                            } else if (diffSecs < 300) {
                              return <span className="text-yellow-400">🟡 Active recently</span>;
                            } else {
                              return <span className="text-gray-500 italic">Idle</span>;
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats & Health */}
                  <div className="text-right text-sm space-y-1 ml-4 flex-shrink-0">
                    {/* Context Usage Bar */}
                    {session.contextTokens > 0 && (
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Context</span>
                          <span className={`font-medium ${
                            (session.totalTokens / session.contextTokens) > 0.8 ? 'text-red-400' :
                            (session.totalTokens / session.contextTokens) > 0.5 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {((session.totalTokens / session.contextTokens) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              (session.totalTokens / session.contextTokens) > 0.8 ? 'bg-red-500' :
                              (session.totalTokens / session.contextTokens) > 0.5 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min((session.totalTokens / session.contextTokens) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="text-gray-400 text-xs">
                      {(session.totalTokens / 1000).toFixed(1)}k / {(session.contextTokens / 1000).toFixed(0)}k
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-2">
                      {session.abortedLastRun && (
                        <span className="text-red-400 text-xs" title="Last run aborted">⚠️ Aborted</span>
                      )}
                      <span className="text-gray-500 text-xs">{formatTime(session.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Keep modal version for backward compatibility
export function SessionSnapshotModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span>📸</span> Current Snapshot
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          <SessionSnapshotTab />
        </div>
      </div>
    </div>
  );
}
