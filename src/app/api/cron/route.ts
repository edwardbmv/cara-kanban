import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch live from OpenClaw gateway
    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:9315';
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (gatewayToken) {
      headers['Authorization'] = `Bearer ${gatewayToken}`;
    }
    
    const response = await fetch(`${gatewayUrl}/api/cron/list`, {
      headers,
      cache: 'no-store', // Always fetch fresh
    });
    
    if (!response.ok) {
      console.error('Gateway response not ok:', response.status);
      return NextResponse.json({ jobs: [], error: 'Gateway unavailable' });
    }
    
    const data = await response.json();
    
    // Transform to simpler format for dashboard
    const jobs = (data.jobs || []).map((job: any) => ({
      id: job.id,
      name: job.name,
      enabled: job.enabled,
      schedule: job.schedule,
      nextRun: formatNextRun(job.schedule, job.state?.nextRunAtMs),
      lastRun: job.state?.lastRunAtMs ? new Date(job.state.lastRunAtMs).toISOString() : null,
      lastStatus: job.state?.lastStatus || null,
    }));
    
    return NextResponse.json({ jobs, live: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching cron jobs:', error);
    return NextResponse.json({ jobs: [], error: String(error) });
  }
}

function formatNextRun(schedule: any, nextRunAtMs?: number): string {
  if (nextRunAtMs) {
    const date = new Date(nextRunAtMs);
    const now = new Date();
    const diffMs = nextRunAtMs - now.getTime();
    
    if (diffMs < 0) return 'overdue';
    if (diffMs < 60000) return 'in < 1 min';
    if (diffMs < 3600000) return `in ${Math.round(diffMs / 60000)} min`;
    if (diffMs < 86400000) return `in ${Math.round(diffMs / 3600000)} hours`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  
  if (!schedule) return 'unknown';
  
  if (schedule.kind === 'every') {
    const mins = Math.round(schedule.everyMs / 60000);
    if (mins < 60) return `every ${mins} min`;
    if (mins < 1440) return `every ${Math.round(mins / 60)} hours`;
    return `every ${Math.round(mins / 1440)} days`;
  }
  
  if (schedule.kind === 'cron') {
    return `cron: ${schedule.expr}`;
  }
  
  if (schedule.kind === 'at') {
    return new Date(schedule.at).toLocaleString();
  }
  
  return 'unknown';
}
