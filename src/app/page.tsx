'use client';

import { useState, useEffect } from 'react';
import ActivityFeed from '@/components/ActivityFeed';
import Calendar from '@/components/Calendar';
import GlobalSearch from '@/components/GlobalSearch';

// ==================== TYPES ====================
interface Output {
  type: 'file' | 'link';
  path?: string;
  url?: string;
  label: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  lane: string;
  column: string;
  timeSpent: number;
  costEstimate: number;
  outputs: Output[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface Lane {
  id: string;
  name: string;
  color: string;
}

interface Column {
  id: string;
  name: string;
}

interface BoardData {
  lanes: Lane[];
  columns: Column[];
  tasks: Task[];
}

type Tab = 'kanban' | 'activity' | 'calendar' | 'search';

// ==================== HELPERS ====================
function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatCost(cost: number): string {
  return cost > 0 ? `$${cost.toFixed(2)}` : '-';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ==================== KANBAN COMPONENTS ====================
function TaskCard({ task, lane }: { task: Task; lane: Lane }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className="bg-gray-800 rounded-lg p-3 mb-2 border-l-4 cursor-pointer hover:bg-gray-750 transition-colors"
      style={{ borderLeftColor: lane.color }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-medium text-white text-sm">{task.title}</h4>
        <span 
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: lane.color + '30', color: lane.color }}
        >
          {lane.name.split('/')[0]}
        </span>
      </div>
      
      {expanded && (
        <>
          <p className="text-gray-400 text-xs mb-2">{task.description}</p>
          
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div>
              <span className="text-gray-500">Time:</span>{' '}
              <span className="text-gray-300">{formatTime(task.timeSpent)}</span>
            </div>
            <div>
              <span className="text-gray-500">Cost:</span>{' '}
              <span className="text-gray-300">{formatCost(task.costEstimate)}</span>
            </div>
            <div>
              <span className="text-gray-500">Created:</span>{' '}
              <span className="text-gray-300">{formatDate(task.createdAt)}</span>
            </div>
            <div>
              <span className="text-gray-500">Updated:</span>{' '}
              <span className="text-gray-300">{formatDate(task.updatedAt)}</span>
            </div>
          </div>

          {task.outputs.length > 0 && (
            <div className="border-t border-gray-700 pt-2 mt-2">
              <span className="text-gray-500 text-xs">Outputs:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {task.outputs.map((output, idx) => (
                  <a
                    key={idx}
                    href={output.url || '#'}
                    className="text-xs px-2 py-1 bg-gray-700 rounded text-blue-400 hover:text-blue-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {output.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      
      {!expanded && (
        <div className="flex gap-3 text-xs text-gray-500">
          <span>⏱ {formatTime(task.timeSpent)}</span>
          <span>💰 {formatCost(task.costEstimate)}</span>
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ column, tasks, lanes }: { column: Column; tasks: Task[]; lanes: Lane[] }) {
  const columnTasks = tasks.filter(t => t.column === column.id);
  
  const bgColors: Record<string, string> = {
    'ideas': 'bg-gray-900',
    'queued': 'bg-yellow-900/20',
    'in-progress': 'bg-blue-900/20',
    'done': 'bg-green-900/20'
  };

  return (
    <div className={`flex-1 min-w-[280px] ${bgColors[column.id] || 'bg-gray-900'} rounded-xl p-4`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-200">{column.name}</h3>
        <span className="text-sm text-gray-500 bg-gray-800 px-2 py-1 rounded-full">
          {columnTasks.length}
        </span>
      </div>
      <div className="space-y-2">
        {columnTasks.map(task => {
          const lane = lanes.find(l => l.id === task.lane)!;
          return <TaskCard key={task.id} task={task} lane={lane} />;
        })}
        {columnTasks.length === 0 && (
          <div className="text-gray-600 text-sm text-center py-8 border-2 border-dashed border-gray-800 rounded-lg">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

function StatsBar({ tasks }: { tasks: Task[] }) {
  const totalTime = tasks.reduce((sum, t) => sum + t.timeSpent, 0);
  const totalCost = tasks.reduce((sum, t) => sum + t.costEstimate, 0);
  const inProgress = tasks.filter(t => t.column === 'in-progress').length;
  const completed = tasks.filter(t => t.column === 'done').length;

  return (
    <div className="flex gap-4 mb-4 text-sm flex-wrap">
      <div className="bg-gray-800 px-4 py-2 rounded-lg">
        <span className="text-gray-400">Time:</span>{' '}
        <span className="text-white font-medium">{formatTime(totalTime)}</span>
      </div>
      <div className="bg-gray-800 px-4 py-2 rounded-lg">
        <span className="text-gray-400">Cost:</span>{' '}
        <span className="text-white font-medium">${totalCost.toFixed(2)}</span>
      </div>
      <div className="bg-gray-800 px-4 py-2 rounded-lg">
        <span className="text-gray-400">Active:</span>{' '}
        <span className="text-blue-400 font-medium">{inProgress}</span>
      </div>
      <div className="bg-gray-800 px-4 py-2 rounded-lg">
        <span className="text-gray-400">Done:</span>{' '}
        <span className="text-green-400 font-medium">{completed}</span>
      </div>
    </div>
  );
}

function LaneFilter({ lanes, activeLanes, setActiveLanes }: {
  lanes: Lane[];
  activeLanes: Set<string>;
  setActiveLanes: (lanes: Set<string>) => void;
}) {
  const toggleLane = (laneId: string) => {
    const next = new Set(activeLanes);
    if (next.has(laneId)) {
      next.delete(laneId);
    } else {
      next.add(laneId);
    }
    setActiveLanes(next);
  };

  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      <span className="text-gray-400 text-sm py-1">Filter:</span>
      {lanes.map(lane => (
        <button
          key={lane.id}
          onClick={() => toggleLane(lane.id)}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            activeLanes.has(lane.id) ? 'text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
          style={{
            backgroundColor: activeLanes.has(lane.id) ? lane.color + '40' : 'transparent',
            borderColor: lane.color,
            borderWidth: '1px'
          }}
        >
          {lane.name}
        </button>
      ))}
    </div>
  );
}

function KanbanBoard() {
  const [data, setData] = useState<BoardData | null>(null);
  const [activeLanes, setActiveLanes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then((boardData: BoardData) => {
        setData(boardData);
        setActiveLanes(new Set(boardData.lanes.map(l => l.id)));
      })
      .catch(() => {
        // Set empty default if API fails
        setData({ lanes: [], columns: [], tasks: [] });
      });
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Loading kanban board...</div>
      </div>
    );
  }

  const filteredTasks = data.tasks.filter(t => activeLanes.has(t.lane));

  return (
    <div>
      <StatsBar tasks={filteredTasks} />
      {data.lanes.length > 0 && (
        <LaneFilter lanes={data.lanes} activeLanes={activeLanes} setActiveLanes={setActiveLanes} />
      )}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {data.columns.map(column => (
          <KanbanColumn key={column.id} column={column} tasks={filteredTasks} lanes={data.lanes} />
        ))}
        {data.columns.length === 0 && (
          <div className="text-gray-500 text-center py-10 w-full">
            No tasks yet. Tasks will appear here as Cara works.
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================
export default function CaraDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('kanban');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'kanban', label: 'Workboard', icon: '📋' },
    { id: 'activity', label: 'Activity', icon: '📊' },
    { id: 'calendar', label: 'Schedule', icon: '📅' },
    { id: 'search', label: 'Search', icon: '🔍' },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐾</span>
            <div>
              <h1 className="text-2xl font-bold">Cara HQ</h1>
              <p className="text-sm text-gray-400">Mission Control & Workboard</p>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-[1600px] mx-auto flex gap-1 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto p-6">
        {activeTab === 'kanban' && <KanbanBoard />}
        {activeTab === 'activity' && <ActivityFeed key={lastUpdated.toISOString()} />}
        {activeTab === 'calendar' && <Calendar key={lastUpdated.toISOString()} />}
        {activeTab === 'search' && <GlobalSearch />}
      </div>
    </main>
  );
}
