import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const WORKSPACE_PATH = '/Users/carayim/.openclaw/workspace';
const MEMORY_PATH = path.join(WORKSPACE_PATH, 'memory');

export interface SearchResult {
  file: string;
  line: number;
  content: string;
  context: string;
  score: number;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  
  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
  }
  
  try {
    const results: SearchResult[] = [];
    const searchPaths = [
      MEMORY_PATH,
      path.join(WORKSPACE_PATH, 'projects'),
      path.join(WORKSPACE_PATH, 'runbooks'),
    ];
    
    // Also search root workspace files
    const rootFiles = ['MEMORY.md', 'AGENTS.md', 'SOUL.md', 'USER.md', 'TOOLS.md', 'HEARTBEAT.md'];
    for (const file of rootFiles) {
      const filePath = path.join(WORKSPACE_PATH, file);
      try {
        await searchFile(filePath, query, results);
      } catch {
        // File doesn't exist, skip
      }
    }
    
    // Search directories
    for (const searchPath of searchPaths) {
      try {
        await searchDirectory(searchPath, query, results);
      } catch {
        // Directory doesn't exist, skip
      }
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    // Apply limit
    const limitedResults = results.slice(0, limit);
    
    return NextResponse.json({ 
      results: limitedResults, 
      total: results.length,
      query 
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

async function searchDirectory(dirPath: string, query: string, results: SearchResult[]): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      await searchDirectory(fullPath, query, results);
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.txt') || entry.name.endsWith('.json')) {
      await searchFile(fullPath, query, results);
    }
  }
}

async function searchFile(filePath: string, query: string, results: SearchResult[]): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();
    
    // Check if any query words match
    const matchCount = queryWords.filter(word => lineLower.includes(word)).length;
    
    if (matchCount > 0) {
      // Calculate score based on match quality
      let score = matchCount / queryWords.length;
      
      // Bonus for exact phrase match
      if (lineLower.includes(queryLower)) {
        score += 0.5;
      }
      
      // Bonus for match in important files
      if (filePath.includes('MEMORY.md')) score += 0.3;
      if (filePath.includes('/memory/')) score += 0.2;
      
      // Get context (surrounding lines)
      const contextStart = Math.max(0, i - 2);
      const contextEnd = Math.min(lines.length, i + 3);
      const context = lines.slice(contextStart, contextEnd).join('\n');
      
      // Get relative path
      const relativePath = filePath.replace(WORKSPACE_PATH + '/', '');
      
      results.push({
        file: relativePath,
        line: i + 1,
        content: line.trim(),
        context: context.trim(),
        score,
      });
    }
  }
}
