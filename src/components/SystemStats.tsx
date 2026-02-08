'use client';

import { useState, useEffect, useCallback } from 'react';

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  memoryMB: number;
}

interface SystemStats {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  uptime: {
    seconds: number;
    formatted: string;
  };
  load: number[];
  hostname: string;
  os: string;
  timestamp: string;
  topProcesses: ProcessInfo[];
}

function UsageBar({ percent, color }: { percent: number; color: string }) {
  const getBarColor = () => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-yellow-500';
    return color;
  };

  return (
    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${getBarColor()}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

function StatCard({ 
  icon, 
  title, 
  value, 
  subtitle, 
  percent, 
  color = 'bg-blue-500',
  details 
}: {
  icon: string;
  title: string;
  value: string;
  subtitle?: string;
  percent?: number;
  color?: string;
  details?: { label: string; value: string }[];
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="text-gray-400 text-sm">{title}</h3>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
      
      {percent !== undefined && (
        <div className="mb-3">
          <UsageBar percent={percent} color={color} />
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
      )}
      
      {details && (
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-700">
          {details.map((d, i) => (
            <div key={i}>
              <span className="text-gray-500 text-xs">{d.label}</span>
              <p className="text-gray-300 text-sm font-medium">{d.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SystemStatsTab() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/system-stats');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStats(data);
      setError(null);
      setLastFetch(new Date());
    } catch (err) {
      setError('Failed to fetch system stats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Loading system stats...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
        {error || 'No data available'}
        <button 
          onClick={fetchStats}
          className="ml-4 px-3 py-1 bg-red-800 rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <p className="text-green-400 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {autoRefresh ? 'Live' : 'Paused'} • Updated {lastFetch.toLocaleTimeString()}
          </p>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            Auto-refresh (5s)
          </label>
        </div>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <span>↻</span> Refresh
        </button>
      </div>

      {/* System Info Banner */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🖥️</span>
          <div>
            <p className="text-white font-medium">{stats.hostname}</p>
            <p className="text-gray-400">{stats.os}</p>
          </div>
        </div>
        <div className="border-l border-gray-700 pl-6">
          <p className="text-gray-400">Uptime</p>
          <p className="text-white font-medium">{stats.uptime.formatted}</p>
        </div>
        <div className="border-l border-gray-700 pl-6">
          <p className="text-gray-400">Load Average</p>
          <p className="text-white font-medium">{stats.load.join(' / ')}</p>
        </div>
        <div className="border-l border-gray-700 pl-6 flex-1">
          <p className="text-gray-400">CPU</p>
          <p className="text-white font-medium text-xs">{stats.cpu.model}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon="⚡"
          title="CPU Usage"
          value={`${stats.cpu.usage}%`}
          percent={stats.cpu.usage}
          color="bg-blue-500"
          subtitle={`${stats.cpu.cores} cores`}
          details={[
            { label: 'Load (1m)', value: stats.load[0].toFixed(2) },
            { label: 'Load (5m)', value: stats.load[1].toFixed(2) },
          ]}
        />

        <StatCard
          icon="🧠"
          title="Memory"
          value={`${stats.memory.used} GB`}
          percent={stats.memory.usagePercent}
          color="bg-purple-500"
          subtitle={`${stats.memory.usagePercent}% of ${stats.memory.total} GB used`}
          details={[
            { label: 'Used', value: `${stats.memory.used} GB` },
            { label: 'Free', value: `${stats.memory.free} GB` },
          ]}
        />

        <StatCard
          icon="💾"
          title="Disk"
          value={`${stats.disk.used} GB`}
          percent={stats.disk.usagePercent}
          color="bg-green-500"
          subtitle={`${stats.disk.usagePercent}% of ${stats.disk.total} GB used`}
          details={[
            { label: 'Used', value: `${stats.disk.used} GB` },
            { label: 'Free', value: `${stats.disk.free} GB` },
          ]}
        />
      </div>

      {/* Top Processes */}
      <div className="mt-6 bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <span>📊</span> Top Processes by Memory
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-left border-b border-gray-700">
                <th className="pb-2 font-medium">Process</th>
                <th className="pb-2 font-medium text-right">Memory</th>
                <th className="pb-2 font-medium text-right">CPU</th>
                <th className="pb-2 font-medium text-right">PID</th>
              </tr>
            </thead>
            <tbody>
              {stats.topProcesses.map((proc, i) => (
                <tr key={proc.pid} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {proc.name.includes('Chrome') ? '🌐' :
                         proc.name.includes('Docker') ? '🐳' :
                         proc.name.includes('openclaw') ? '🐾' :
                         proc.name.includes('Next') ? '▲' :
                         proc.name.includes('node') ? '🟢' :
                         '⚙️'}
                      </span>
                      <span className="text-white">{proc.name}</span>
                    </div>
                  </td>
                  <td className="py-2 text-right">
                    <span className={`font-mono ${proc.memoryMB > 500 ? 'text-yellow-400' : 'text-gray-300'}`}>
                      {proc.memoryMB >= 1024 
                        ? `${(proc.memoryMB / 1024).toFixed(1)} GB`
                        : `${proc.memoryMB} MB`}
                    </span>
                    <span className="text-gray-500 ml-2">({proc.memory}%)</span>
                  </td>
                  <td className="py-2 text-right">
                    <span className={`font-mono ${proc.cpu > 50 ? 'text-yellow-400' : 'text-gray-300'}`}>
                      {proc.cpu}%
                    </span>
                  </td>
                  <td className="py-2 text-right text-gray-500 font-mono">{proc.pid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Health Check */}
      <div className="mt-4 bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
        <h3 className="text-gray-400 text-sm mb-2">Quick Health Check</h3>
        <div className="flex gap-4 flex-wrap">
          {stats.cpu.usage < 80 && stats.memory.usagePercent < 85 && stats.disk.usagePercent < 90 ? (
            <span className="text-green-400 flex items-center gap-2">
              ✅ All systems healthy
            </span>
          ) : (
            <>
              {stats.cpu.usage >= 80 && (
                <span className="text-yellow-400">⚠️ High CPU usage</span>
              )}
              {stats.memory.usagePercent >= 85 && (
                <span className="text-yellow-400">⚠️ High memory usage</span>
              )}
              {stats.disk.usagePercent >= 90 && (
                <span className="text-red-400">🔴 Disk almost full</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
