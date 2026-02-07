import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // In production (Vercel), read from public/data
    // In development, try to read from the local activity log first
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Read from static JSON file (synced by cron job)
      const dataPath = path.join(process.cwd(), 'public', 'data', 'activity.json');
      try {
        const data = await fs.readFile(dataPath, 'utf-8');
        const activities = JSON.parse(data);
        return NextResponse.json(activities);
      } catch {
        return NextResponse.json([]);
      }
    }
    
    // Development: try to read local activity log
    const activityLogPath = process.env.ACTIVITY_LOG_PATH || 
      path.join(process.env.HOME || '', '.openclaw/workspace/logs/activity.jsonl');
    
    try {
      const content = await fs.readFile(activityLogPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const activities = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean).reverse().slice(0, 100);
      
      return NextResponse.json(activities);
    } catch {
      // Fall back to static file
      const dataPath = path.join(process.cwd(), 'public', 'data', 'activity.json');
      try {
        const data = await fs.readFile(dataPath, 'utf-8');
        return NextResponse.json(JSON.parse(data));
      } catch {
        return NextResponse.json([]);
      }
    }
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json([]);
  }
}
