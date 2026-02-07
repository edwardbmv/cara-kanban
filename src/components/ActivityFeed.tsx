'use client';

import { useState, useEffect } from 'react';

interface Activity {
  timestamp: string;
  action: string;
  category: 'file' | 'exec' | 'browser' | 'message' | 'cron' | 'search' | 'other';
  details: string;
  sessionId?: string;
  instance?: string;
  channel?: string;
  project?: string;
  cost?: number;
}

type SortField = 'time' | 'instance' | 'category';
type SortDirection = 'asc' | 'desc';

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

const instanceColors: Record<string, string> = {
  'main': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'cara-hq': 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'discord': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  'cron': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

function getInstanceColor(instance: string): string {
  const lower = instance.toLowerCase();
  for (const [key, color] of Object.entries(instanceColors)) {
    if (lower.includes(key)) return color;
  }
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [instanceFilter, setInstanceFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [total, setTotal] = useState(0);
  const [instances, setInstances] = useState<string[]>([]);

  useEffect(() => {
    fetchActivities();
  }, [filter]);

  async function fetchActivities() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (filter !== 'all') params.set('category', filter);
      
      const res = await fetch(`/api/activity?${params}`);
      const data = await res.json();
      const acts = data.activities || [];
      setActivities(acts);
      setTotal(data.total || 0);
      
      // Extract unique instances
      const uniqueInstances = [...new Set(acts.map((a: Activity) => a.instance || a.channel || 'unknown').filter(Boolean))];
      setInstances(uniqueInstances as string[]);
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

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'time' ? 'desc' : 'asc');
    }
  }

  // Filter and sort activities
  const filteredActivities = activities
    .filter(a => instanceFilter === 'all' || (a.instance || a.channel || 'unknown') === instanceFilter)
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'time':
          cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'instance':
          cmp = (a.instance || a.channel || '').localeCompare(b.instance || b.channel || '');
          break;
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

  const categories = ['all', 'file', 'exec', 'browser', 'message', 'cron', 'search', 'other'];

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`px-3 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${
        sortField === field
          ? 'bg-blue-600 text-white'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {label}
      {sortField === field && (
        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold">Activity Feed</h2>
          <p className="text-sm text-gray-400">
            Tracking every action Cara takes • {total} total activities
          </p>
        </div>
      </div>
      
      {/* Filters & Sorting */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-gray-500 text-sm py-1">Category:</span>
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

        {/* Instance Filter */}
        {instances.length > 1 && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-gray-500 text-sm">Instance:</span>
            <select
              value={instanceFilter}
              onChange={(e) => setInstanceFilter(e.target.value)}
              className="bg-gray-700 text-gray-300 px-3 py-1 rounded-lg text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Instances</option>
              {instances.map((inst) => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sort Controls */}
        <div className="flex gap-2 items-center ml-auto">
          <span className="text-gray-500 text-sm">Sort:</span>
          <SortButton field="time" label="Time" />
          <SortButton field="instance" label="Instance" />
          <SortButton field="category" label="Category" />
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full mb-2"></div>
            <p>Loading activities...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p>No activities {filter !== 'all' || instanceFilter !== 'all' ? 'matching filters' : 'recorded yet'}</p>
            <p className="text-sm mt-2">Activities will appear here as Cara works</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredActivities.map((activity, idx) => {
              const instanceName = activity.instance || activity.channel || activity.project || null;
              return (
                <div key={idx} className="p-4 hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${categoryColors[activity.category]}`}>
                      <span className="text-lg">{categoryIcons[activity.category]}</span>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{activity.action}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${categoryColors[activity.category]}`}>
                          {activity.category}
                        </span>
                        {instanceName && (
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${getInstanceColor(instanceName)}`}>
                            {instanceName}
                          </span>
                        )}
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
              );
            })}
          </div>
        )}
      </div>
      
      {/* Footer Stats */}
      {filteredActivities.length > 0 && (
        <div className="text-sm text-gray-500 text-right">
          Showing {filteredActivities.length} of {total} activities
        </div>
      )}
    </div>
  );
}
