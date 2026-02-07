import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'public', 'data', 'status.json');
    const data = await fs.readFile(dataPath, 'utf-8');
    const status = JSON.parse(data);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({
      lastSync: null,
      hostname: 'unknown',
      activityCount: 0,
      cronJobCount: 0
    });
  }
}
