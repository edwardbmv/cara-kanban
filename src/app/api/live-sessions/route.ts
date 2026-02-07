import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Path to OpenClaw's internal session index
const OPENCLAW_SESSIONS_PATH = process.env.OPENCLAW_SESSIONS_PATH || 
  path.join(process.env.HOME || '', '.openclaw/agents/voice/sessions/sessions.json');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Read directly from OpenClaw's session index
    const data = await fs.readFile(OPENCLAW_SESSIONS_PATH, 'utf-8');
    const sessionsIndex = JSON.parse(data);
    
    // Transform to our frontend format
    const sessions = Object.entries(sessionsIndex)
      .filter(([key]) => !key.includes('openai:')) // Filter out OpenAI sessions
      .map(([key, session]: [string, any]) => ({
        key,
        kind: key.includes(':main') ? 'dm' : key.includes('group') ? 'group' : 'other',
        channel: extractChannel(key),
        displayName: formatDisplayName(key, session),
        model: session.model || 'unknown',
        totalTokens: session.totalTokens || 0,
        contextTokens: session.contextTokens || 200000,
        updatedAt: session.updatedAt || Date.now(),
        sessionId: session.sessionId?.slice(0, 8) || '',
        currentTask: session.currentTask,
        lastMessage: session.lastMessage,
        abortedLastRun: session.abortedLastRun || false,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt) // Most recent first
      .slice(0, 20); // Limit to 20 sessions

    return NextResponse.json({
      sessions,
      lastUpdated: new Date().toISOString(),
      live: true,
    });
  } catch (error) {
    console.error('Failed to read OpenClaw sessions:', error);
    
    // Fall back to static file
    try {
      const dataPath = path.join(process.cwd(), 'public', 'data', 'sessions.json');
      const data = await fs.readFile(dataPath, 'utf-8');
      const staticData = JSON.parse(data);
      return NextResponse.json({ ...staticData, live: false });
    } catch {
      return NextResponse.json({ sessions: [], lastUpdated: null, live: false });
    }
  }
}

function extractChannel(key: string): string {
  if (key.includes('telegram')) return 'telegram';
  if (key.includes('discord')) return 'discord';
  if (key.includes('slack')) return 'slack';
  if (key.includes('signal')) return 'signal';
  return 'unknown';
}

function formatDisplayName(key: string, session: any): string {
  // Extract meaningful name from session key
  if (key.includes(':main')) return 'Edward Yim (Main)';
  if (key.includes('topic:1')) return 'Cara HQ / Jira Work';
  if (key.includes('topic:2')) return 'Cara HQ / TEAS Dev';
  if (key.includes('topic:3')) return 'Cara HQ / Infrastructure';
  
  // Fallback: use displayName from session or parse the key
  if (session.displayName) return session.displayName;
  
  const parts = key.split(':');
  return parts[parts.length - 1] || key;
}
