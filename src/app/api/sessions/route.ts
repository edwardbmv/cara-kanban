import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'public', 'data', 'sessions.json');
    const data = await fs.readFile(dataPath, 'utf-8');
    const sessions = JSON.parse(data);
    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json({
      sessions: [],
      lastUpdated: null
    });
  }
}
