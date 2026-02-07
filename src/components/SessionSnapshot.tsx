'use client';

import { useState, useEffect } from 'react';

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

export default function SessionSnapshot({ isOpen, onClose, autoLoad = false }: { isOpen: boolean; onClose: () => void; autoLoad?: boolean }) {
  const [data, setData] = useState<SessionData>({ sessions: [], lastUpdated: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  async function fetchSessions() {
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
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span>📸</span> Current Snapshot
            </h2>
            <p className="text-sm text-gray-400">
              {data.live ? (
                <span className="text-green-400">🟢 Live data • {new Date(data.lastUpdated!).toLocaleTimeString()}</span>
              ) : data.lastUpdated ? (
                <span>📁 Static • {new Date(data.lastUpdated).toLocaleString()}</span>
              ) : (
                'No data available'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSessions}
              disabled={loading}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm disabled:opacity-50"
            >
              {loading ? '↻ Refreshing...' : '↻ Refresh'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          {loading && data.sessions.length === 0 ? (
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
            <div className="space-y-3">
              {data.sessions.map((session) => (
                <div
                  key={session.key}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {/* Channel Icon */}
                      <div className="text-2xl">{getChannelIcon(session.channel)}</div>
                      
                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{session.displayName}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${getKindColor(session.kind)}`}>
                            {session.kind}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {session.channel} • {session.model}
                        </div>
                        {session.currentTask && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-500">Working on:</span>{' '}
                            <span className="text-gray-300">{session.currentTask}</span>
                          </div>
                        )}
                        {session.lastMessage && (
                          <div className="mt-1 text-sm text-gray-500 truncate max-w-md">
                            Last: {session.lastMessage}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats & Health */}
                    <div className="text-right text-sm space-y-1">
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
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
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
                      <div className="text-gray-400">
                        {(session.totalTokens / 1000).toFixed(1)}k / {(session.contextTokens / 1000).toFixed(0)}k
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {session.abortedLastRun && (
                          <span className="text-red-400 text-xs" title="Last run aborted">⚠️</span>
                        )}
                        <span className="text-gray-500">{formatTime(session.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {data.sessions.length > 0 && (() => {
          const totalTokens = data.sessions.reduce((sum, s) => sum + s.totalTokens, 0);
          const totalContext = data.sessions.reduce((sum, s) => sum + (s.contextTokens || 200000), 0);
          const avgUsage = totalTokens / totalContext;
          const abortedCount = data.sessions.filter(s => s.abortedLastRun).length;
          
          return (
            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
              <div className="flex justify-between text-sm text-gray-400 flex-wrap gap-2">
                <span>{data.sessions.length} active session{data.sessions.length !== 1 ? 's' : ''}</span>
                <span>Total: {(totalTokens / 1000).toFixed(1)}k tokens</span>
                <span className={avgUsage > 0.5 ? 'text-yellow-400' : ''}>
                  Avg context: {(avgUsage * 100).toFixed(0)}%
                </span>
                {abortedCount > 0 && (
                  <span className="text-red-400">⚠️ {abortedCount} aborted</span>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
