import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// Create task
router.post('/', (req, res) => {
  const { project_id, title, description, start_date, duration_minutes } = req.body;

  const maxOrder = db.prepare(
    'SELECT MAX("order") as max FROM tasks WHERE project_id = ?'
  ).get(project_id) as any;
  const order = (maxOrder?.max ?? -1) + 1;

  const result = db.prepare(`
    INSERT INTO tasks (project_id, title, description, start_date, duration_minutes, "order")
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(project_id, title, description || null, start_date || null, duration_minutes || 60, order);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

// Update task
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { 
    title, 
    description, 
    start_date, 
    duration_minutes, 
    order, 
    completed, 
    project_id,
    tracking_state,
    tracking_started_at,
    time_tracked_minutes
  } = req.body;

  const updates: string[] = [];
  const values: any[] = [];

  if (title !== undefined) {
    updates.push('title = ?');
    values.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (start_date !== undefined) {
    updates.push('start_date = ?');
    values.push(start_date);
  }
  if (duration_minutes !== undefined) {
    updates.push('duration_minutes = ?');
    values.push(duration_minutes);
  }
  if (order !== undefined) {
    updates.push('"order" = ?');
    values.push(order);
  }
  if (completed !== undefined) {
    updates.push('completed = ?');
    values.push(completed ? 1 : 0);
  }
  if (project_id !== undefined) {
    updates.push('project_id = ?');
    values.push(project_id);
  }
  if (tracking_state !== undefined) {
    updates.push('tracking_state = ?');
    values.push(tracking_state);
    
    // If starting a task, stop all other tasks that are currently started
    if (tracking_state === 'started') {
      const runningTasks = db.prepare(
        'SELECT id, tracking_started_at, time_tracked_minutes FROM tasks WHERE tracking_state = ? AND id != ?'
      ).all('started', id) as any[];
      
      // Stop each running task and update its tracked time
      runningTasks.forEach((runningTask: any) => {
        if (runningTask.tracking_started_at) {
          const startedAt = new Date(runningTask.tracking_started_at).getTime();
          const now = Date.now();
          const elapsedMinutes = Math.floor((now - startedAt) / 60000);
          
          db.prepare(
            'UPDATE tasks SET tracking_state = ?, time_tracked_minutes = ?, tracking_started_at = NULL WHERE id = ?'
          ).run('stopped', runningTask.time_tracked_minutes + elapsedMinutes, runningTask.id);
        }
      });
    }
  }
  if (tracking_started_at !== undefined) {
    updates.push('tracking_started_at = ?');
    values.push(tracking_started_at);
  }
  if (time_tracked_minutes !== undefined) {
    updates.push('time_tracked_minutes = ?');
    values.push(time_tracked_minutes);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(task);
});

// Delete task
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.status(204).send();
});

export default router;
