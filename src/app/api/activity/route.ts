import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const ACTIVITY_LOG_PATH = '/Users/carayim/.openclaw/workspace/logs/activity.jsonl';

export interface ActivityEntry {
  timestamp: string;
  action: string;
  category: 'file' | 'exec' | 'browser' | 'message' | 'cron' | 'search' | 'other';
  details: string;
  sessionId?: string;
  cost?: number;
}

// GET - Read activity log
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const category = url.searchParams.get('category');
    
    let content = '';
    try {
      content = await fs.readFile(ACTIVITY_LOG_PATH, 'utf-8');
    } catch (e) {
      // File doesn't exist yet
      return NextResponse.json({ activities: [], total: 0 });
    }
    
    const lines = content.trim().split('\n').filter(Boolean);
    let activities: ActivityEntry[] = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean) as ActivityEntry[];
    
    // Filter by category if specified
    if (category) {
      activities = activities.filter(a => a.category === category);
    }
    
    // Sort by timestamp descending (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Apply limit
    const limitedActivities = activities.slice(0, limit);
    
    return NextResponse.json({ 
      activities: limitedActivities, 
      total: activities.length 
    });
  } catch (error) {
    console.error('Error reading activity log:', error);
    return NextResponse.json({ error: 'Failed to read activity log' }, { status: 500 });
  }
}

// POST - Add new activity entry
export async function POST(request: NextRequest) {
  try {
    const entry: Omit<ActivityEntry, 'timestamp'> = await request.json();
    
    const fullEntry: ActivityEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(ACTIVITY_LOG_PATH), { recursive: true });
    
    // Append to log file
    await fs.appendFile(ACTIVITY_LOG_PATH, JSON.stringify(fullEntry) + '\n');
    
    return NextResponse.json({ success: true, entry: fullEntry });
  } catch (error) {
    console.error('Error writing activity:', error);
    return NextResponse.json({ error: 'Failed to write activity' }, { status: 500 });
  }
}
