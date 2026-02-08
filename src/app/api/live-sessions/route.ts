import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Path to OpenClaw's internal session index
const OPENCLAW_SESSIONS_PATH = process.env.OPENCLAW_SESSIONS_PATH || 
  path.join(process.env.HOME || '', '.openclaw/agents/voice/sessions/sessions.json');

const SESSIONS_DIR = path.join(process.env.HOME || '', '.openclaw/agents/voice/sessions');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Get last user message from transcript
async function getLastUserMessage(sessionId: string, key: string): Promise<string | null> {
  if (!sessionId) return null;
  
  try {
    // Try to find the transcript file
    // Files can be: sessionId.jsonl or sessionId-topic-N.jsonl
    let transcriptPath = path.join(SESSIONS_DIR, `${sessionId}.jsonl`);
    
    // For topic sessions, try the topic-specific file
    const topicMatch = key.match(/topic:(\d+)/);
    if (topicMatch) {
      const topicPath = path.join(SESSIONS_DIR, `${sessionId}-topic-${topicMatch[1]}.jsonl`);
      try {
        await fs.access(topicPath);
        transcriptPath = topicPath;
      } catch {
        // Fall back to base session file
      }
    }
    
    // Read last 100 lines of transcript file (user messages can be sparse among tool calls)
    const content = execSync(`tail -100 "${transcriptPath}" 2>/dev/null`, { encoding: 'utf-8' });
    if (!content) return null;
    
    const lines = content.trim().split('\n').filter(l => l.trim());
    
    // Find the last user message
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        
        // Handle wrapped format: {type: "message", message: {role: "user", ...}}
        const msg = entry.message || entry;
        
        if (msg.role === 'user' && msg.content) {
          // Extract text content
          let text = '';
          if (typeof msg.content === 'string') {
            text = msg.content;
          } else if (Array.isArray(msg.content)) {
            const textPart = msg.content.find((c: any) => c.type === 'text');
            text = textPart?.text || '';
          }
          // Clean up: remove [Telegram...] prefixes, timestamps, etc.
          text = text.replace(/^\[.*?\]\s*/g, '').trim();
          text = text.replace(/^Edward Yim \(\d+\):\s*/i, '').trim();
          text = text.split('\n')[0]; // First line only
          if (text.length > 80) text = text.slice(0, 80) + '...';
          if (text && text.length > 3) return text;
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // Read directly from OpenClaw's session index
    const data = await fs.readFile(OPENCLAW_SESSIONS_PATH, 'utf-8');
    const sessionsIndex = JSON.parse(data);
    
    // Transform to our frontend format
    const sessionEntries = Object.entries(sessionsIndex)
      .filter(([key]) => !key.includes('openai:')) // Filter out OpenAI sessions
      .sort(([, a]: [string, any], [, b]: [string, any]) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 15); // Limit to 15 sessions
    
    // Get last messages in parallel
    const sessions = await Promise.all(
      sessionEntries.map(async ([key, session]: [string, any]) => {
        const lastMessage = session.sessionId 
          ? await getLastUserMessage(session.sessionId, key)
          : null;
        
        return {
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
          lastMessage,
          abortedLastRun: session.abortedLastRun || false,
        };
      })
    );

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
