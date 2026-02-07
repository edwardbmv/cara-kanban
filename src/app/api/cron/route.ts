import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';

const CRON_JOBS_CACHE = '/Users/carayim/.openclaw/workspace/data/cron-jobs.json';
const GATEWAY_URL = 'http://127.0.0.1:18789';

export interface CronJob {
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
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Try to fetch live from gateway first
    const liveJobs = await fetchFromGateway();
    if (liveJobs) {
      // Cache the results
      await fs.writeFile(CRON_JOBS_CACHE, JSON.stringify(liveJobs, null, 2));
      return NextResponse.json({ jobs: liveJobs, source: 'live' });
    }
    
    // Fall back to cached file
    const content = await fs.readFile(CRON_JOBS_CACHE, 'utf-8');
    const jobs: CronJob[] = JSON.parse(content);
    return NextResponse.json({ jobs, source: 'cache' });
    
  } catch (error) {
    console.error('Error fetching cron jobs:', error);
    return NextResponse.json({ jobs: [], error: 'Failed to load cron jobs' });
  }
}

async function fetchFromGateway(): Promise<CronJob[] | null> {
  try {
    // OpenClaw gateway internal API
    const response = await fetch(`${GATEWAY_URL}/api/cron`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list' }),
      signal: AbortSignal.timeout(3000),
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.jobs) return null;
    
    // Transform to our format
    return data.jobs.map((job: any) => ({
      id: job.id,
      name: job.name || job.id,
      schedule: job.schedule,
      payload: {
        kind: job.payload?.kind,
        text: job.payload?.text,
        message: job.payload?.message,
      },
      sessionTarget: job.sessionTarget,
      enabled: job.enabled !== false,
      nextRun: job.state?.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : undefined,
      lastRun: job.state?.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : undefined,
      state: job.state,
    }));
  } catch (error) {
    console.error('Gateway fetch failed:', error);
    return null;
  }
}

// Endpoint to refresh cron data manually
export async function POST(request: NextRequest) {
  const jobs = await fetchFromGateway();
  if (jobs) {
    await fs.writeFile(CRON_JOBS_CACHE, JSON.stringify(jobs, null, 2));
    return NextResponse.json({ success: true, jobs, count: jobs.length });
  }
  return NextResponse.json({ success: false, error: 'Could not fetch from gateway' }, { status: 500 });
}
