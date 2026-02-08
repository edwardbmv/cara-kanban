'use client';

import { useState, useEffect } from 'react';

interface CronJob {
  id: string;
  name: string;
  schedule: {
    kind: 'at' | 'every' | 'cron';
    at?: string;
    everyMs?: number;
    expr?: string;
    tz?: string;
  };
  payload: {
    kind: 'systemEvent' | 'agentTurn';
    text?: string;
    message?: string;
  };
  sessionTarget: 'main' | 'isolated';
  enabled: boolean;
  nextRun?: string;
  lastRun?: string;
}

// Human-readable descriptions for known jobs
const JOB_DESCRIPTIONS: Record<string, string> = {
  'Email Monitor': 'Checks cara@bluemoonventures.com for new emails every 3 minutes and summarizes unread messages.',
  'Daily Morning Brief': 'Sends Edward a daily summary at 7:30 AM with project status, priorities, and proactive ideas.',
  'Good morning text': 'One-time scheduled good morning message.',
  'Evening Work Session': 'Autonomous 2-hour work session at 10 PM - picks highest priority task and works on it.',
  'End of Day Export': 'Archives the full day\'s transcript and creates a summary at 3 AM.',
  'Cara Resurrection Bundle': 'Creates a backup of all critical files at 3 AM for disaster recovery.',
  'TEAS Daily Nurture Emails': 'Triggers the TEAS platform to send daily study reminder emails to users at 7 AM.',
  'Weekly Strategic Review': 'Deep analysis of weekly progress and strategic planning every Sunday at 6 PM.',
  'OpenClaw Update Check & Analysis': 'Checks for OpenClaw updates every 3 days and analyzes if safe to upgrade.',
  'TEAS Question Reports Check': 'Monitors for user-reported question issues every 30 minutes and emails Edward if any found.',
  'Social Media Warming - Morning': 'Account warming at 10 AM - rotates platforms daily (X, Instagram, TikTok, Facebook).',
  'Social Media Warming - Afternoon': 'Second warming session at 2 PM on a different platform.',
  'Twilio SMS Check': 'Monitors incoming SMS every 15 minutes (read-only, no command execution).',
  'Proxy fix follow-up': 'Reminder to verify the nurse.org proxy fix is working.',
  'Security config reminder': 'Reminder to review security hardening options.',
};

export default function Calendar() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'week'>('list');
  const [currentWeek, setCurrentWeek] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentWeek(new Date());
    fetchCronJobs();
  }, []);

  async function fetchCronJobs() {
    setLoading(true);
    try {
      // Try to fetch directly from local gateway first (live data)
      const gatewayUrl = localStorage.getItem('openclaw_gateway_url') || 'http://localhost:9315';
      
      try {
        const gatewayRes = await fetch(`${gatewayUrl}/api/cron/list`, {
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (gatewayRes.ok) {
          const data = await gatewayRes.json();
          const transformedJobs = (data.jobs || []).map((job: any) => ({
            ...job,
            nextRun: job.state?.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : job.nextRun,
            lastRun: job.state?.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : null,
          }));
          setJobs(transformedJobs);
          setLoading(false);
          return;
        }
      } catch (gatewayError) {
        console.log('Gateway not reachable, falling back to API');
      }
      
      // Fallback to API route (static data)
      const res = await fetch('/api/cron');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch cron jobs:', error);
    }
    setLoading(false);
  }

  function formatSchedule(job: CronJob): string {
    const { schedule } = job;
    
    if (schedule.kind === 'at' && schedule.at) {
      return `Once at ${new Date(schedule.at).toLocaleString()}`;
    }
    
    if (schedule.kind === 'every' && schedule.everyMs) {
      const mins = schedule.everyMs / 60000;
      if (mins < 60) return `Every ${mins} minutes`;
      const hours = mins / 60;
      if (hours < 24) return `Every ${hours} hours`;
      return `Every ${hours / 24} days`;
    }
    
    if (schedule.kind === 'cron' && schedule.expr) {
      // Parse common cron patterns
      const expr = schedule.expr;
      if (expr === '30 7 * * *') return 'Daily at 7:30 AM';
      if (expr === '0 8 * * *') return 'Daily at 8:00 AM';
      if (expr === '0 9 * * 1') return 'Weekly on Mondays at 9 AM';
      return `Cron: ${expr}`;
    }
    
    return 'Unknown schedule';
  }

  function getWeekDays(date: Date): Date[] {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }

  function getJobsForDay(date: Date): CronJob[] {
    return jobs.filter(job => {
      if (!job.nextRun) return false;
      const nextRun = new Date(job.nextRun);
      return nextRun.toDateString() === date.toDateString();
    });
  }

  const weekDays = currentWeek ? getWeekDays(currentWeek) : [];
  const today = mounted ? new Date() : null;

  if (!mounted) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center text-gray-400">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full mb-2"></div>
        <p>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Scheduled Tasks</h2>
          <p className="text-sm text-gray-400">
            All cron jobs and scheduled events • {jobs.length} total jobs
          </p>
        </div>
        
        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📋 List
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              view === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📅 Week
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center text-gray-400">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full mb-2"></div>
          <p>Loading scheduled tasks...</p>
        </div>
      ) : view === 'list' ? (
        /* List View */
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {jobs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="text-4xl mb-2">📅</p>
              <p>No scheduled tasks</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${job.enabled ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      <div>
                        <h3 className="font-medium">{job.name || job.id}</h3>
                        <p className="text-sm text-gray-400">{formatSchedule(job)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        job.sessionTarget === 'main' 
                          ? 'bg-purple-500/20 text-purple-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {job.sessionTarget}
                      </span>
                      {job.nextRun && (
                        <p className="text-xs text-gray-500 mt-1">
                          Next: {isNaN(new Date(job.nextRun).getTime()) 
                            ? job.nextRun 
                            : new Date(job.nextRun).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-400">
                    {JOB_DESCRIPTIONS[job.name] || job.payload?.text || job.payload?.message || 'No description available'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Week View */
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {/* Week Navigation */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <button
              onClick={() => {
                const prev = new Date(currentWeek);
                prev.setDate(prev.getDate() - 7);
                setCurrentWeek(prev);
              }}
              className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
            >
              ← Prev
            </button>
            <h3 className="font-medium">
              {weekDays[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - 
              {weekDays[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h3>
            <button
              onClick={() => {
                const next = new Date(currentWeek);
                next.setDate(next.getDate() + 7);
                setCurrentWeek(next);
              }}
              className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
            >
              Next →
            </button>
          </div>
          
          {/* Week Grid */}
          <div className="grid grid-cols-7 divide-x divide-gray-700">
            {weekDays.map((day, idx) => {
              const dayJobs = getJobsForDay(day);
              const isToday = today ? day.toDateString() === today.toDateString() : false;
              
              return (
                <div key={idx} className={`min-h-32 p-2 ${isToday ? 'bg-blue-900/20' : ''}`}>
                  <div className={`text-center mb-2 ${isToday ? 'text-blue-400' : 'text-gray-400'}`}>
                    <div className="text-xs">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className={`text-lg font-bold ${isToday ? 'bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}>
                      {day.getDate()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {dayJobs.map((job) => (
                      <div
                        key={job.id}
                        className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded truncate"
                        title={job.name || job.id}
                      >
                        {job.name || job.id}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
