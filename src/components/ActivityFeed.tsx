'use client';

import { useState, useEffect } from 'react';

interface Activity {
  timestamp: string;
  action: string;
  category: 'file' | 'exec' | 'browser' | 'message' | 'cron' | 'search' | 'other';
  details: string;
  sessionId?: string;
  cost?: number;
}

const categoryIcons: Record<string, string> = {
  file: '📁',
  exec: '⚡',
  browser: '🌐',
  message: '💬',
  cron: '⏰',
  search: '🔍',
  other: '📌',
};

const categoryColors: Record<string, string> = {
  file: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  exec: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  browser: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  message: 'bg-green-500/20 text-green-400 border-green-500/30',
  cron: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  search: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchActivities();
  }, [filter]);

  async function fetchActivities() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filter !== 'all') params.set('category', filter);
      
      const res = await fetch(`/api/activity?${params}`);
      const data = await res.json();
      setActivities(data.activities || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
    setLoading(false);
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  const categories = ['all', 'file', 'exec', 'browser', 'message', 'cron', 'search', 'other'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Activity Feed</h2>
          <p className="text-sm text-gray-400">
            Tracking every action Cara takes • {total} total activities
          </p>
        </div>
        
        {/* Filter */}
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {cat === 'all' ? 'All' : categoryIcons[cat]} {cat !== 'all' && cat}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full mb-2"></div>
            <p>Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p>No activities recorded yet</p>
            <p className="text-sm mt-2">Activities will appear here as Cara works</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {activities.map((activity, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${categoryColors[activity.category]}`}>
                    <span className="text-lg">{categoryIcons[activity.category]}</span>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{activity.action}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${categoryColors[activity.category]}`}>
                        {activity.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1 truncate">{activity.details}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{formatTime(activity.timestamp)}</span>
                      {activity.sessionId && <span>Session: {activity.sessionId.slice(0, 8)}</span>}
                      {activity.cost && <span>Cost: ${activity.cost.toFixed(4)}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
