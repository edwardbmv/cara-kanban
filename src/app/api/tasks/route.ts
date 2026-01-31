import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'src/data/tasks.json');

export async function GET() {
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading tasks:', error);
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Read current data
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    if (body.action === 'add') {
      const newTask = {
        id: `task-${Date.now()}`,
        ...body.task,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null
      };
      data.tasks.push(newTask);
    } else if (body.action === 'update') {
      const idx = data.tasks.findIndex((t: { id: string }) => t.id === body.task.id);
      if (idx !== -1) {
        data.tasks[idx] = {
          ...data.tasks[idx],
          ...body.task,
          updatedAt: new Date().toISOString()
        };
      }
    } else if (body.action === 'move') {
      const idx = data.tasks.findIndex((t: { id: string }) => t.id === body.taskId);
      if (idx !== -1) {
        const task = data.tasks[idx];
        task.column = body.column;
        task.updatedAt = new Date().toISOString();
        
        if (body.column === 'in-progress' && !task.startedAt) {
          task.startedAt = new Date().toISOString();
        }
        if (body.column === 'done' && !task.completedAt) {
          task.completedAt = new Date().toISOString();
        }
      }
    } else if (body.action === 'delete') {
      data.tasks = data.tasks.filter((t: { id: string }) => t.id !== body.taskId);
    }
    
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating tasks:', error);
    return NextResponse.json({ error: 'Failed to update tasks' }, { status: 500 });
  }
}
