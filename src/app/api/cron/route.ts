import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // In production (Vercel), read from public/data
    // In development, read from local cron-jobs.json
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Read from static JSON file (synced by cron job)
      const dataPath = path.join(process.cwd(), 'public', 'data', 'cron-jobs.json');
      try {
        const data = await fs.readFile(dataPath, 'utf-8');
        const jobs = JSON.parse(data);
        return NextResponse.json(jobs);
      } catch {
        return NextResponse.json([]);
      }
    }
    
    // Development: try to read local cron jobs file
    const cronPath = process.env.CRON_JOBS_PATH || 
      path.join(process.env.HOME || '', '.openclaw/workspace/data/cron-jobs.json');
    
    try {
      const content = await fs.readFile(cronPath, 'utf-8');
      const jobs = JSON.parse(content);
      return NextResponse.json(jobs);
    } catch {
      // Fall back to static file
      const dataPath = path.join(process.cwd(), 'public', 'data', 'cron-jobs.json');
      try {
        const data = await fs.readFile(dataPath, 'utf-8');
        return NextResponse.json(JSON.parse(data));
      } catch {
        return NextResponse.json([]);
      }
    }
  } catch (error) {
    console.error('Error fetching cron jobs:', error);
    return NextResponse.json([]);
  }
}
