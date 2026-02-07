import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    // In production (Vercel), read from public/data
    // In development, try to read from the local activity log first
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    
    let activities: any[] = [];
    
    if (isProduction) {
      // Read from static JSON file (synced by cron job)
      const dataPath = path.join(process.cwd(), 'public', 'data', 'activity.json');
      try {
        const data = await fs.readFile(dataPath, 'utf-8');
        activities = JSON.parse(data);
      } catch {
        activities = [];
      }
    } else {
      // Development: try to read local activity log
      const activityLogPath = process.env.ACTIVITY_LOG_PATH || 
        path.join(process.env.HOME || '', '.openclaw/workspace/logs/activity.jsonl');
      
      try {
        const content = await fs.readFile(activityLogPath, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        activities = lines.map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        }).filter(Boolean).reverse();
      } catch {
        // Fall back to static file
        const dataPath = path.join(process.cwd(), 'public', 'data', 'activity.json');
        try {
          const data = await fs.readFile(dataPath, 'utf-8');
          activities = JSON.parse(data);
        } catch {
          activities = [];
        }
      }
    }
    
    // Filter by category if specified
    if (category && category !== 'all') {
      activities = activities.filter((a: any) => a.category === category);
    }
    
    const total = activities.length;
    const limited = activities.slice(0, limit);
    
    return NextResponse.json({
      activities: limited,
      total: total
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ activities: [], total: 0 });
  }
}
