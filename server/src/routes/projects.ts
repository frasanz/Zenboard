import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// Get all projects with tasks and subtasks
router.get('/', (_req, res) => {
  const projects = db.prepare(`
    SELECT * FROM projects ORDER BY "order" ASC, id ASC
  `).all() as any[];

  const tasks = db.prepare(`
    SELECT * FROM tasks ORDER BY "order" ASC, id ASC
  `).all() as any[];

  const subtasks = db.prepare(`
    SELECT * FROM subtasks ORDER BY "order" ASC, id ASC
  `).all() as any[];

  // Build nested structure
  const tasksWithSubtasks = tasks.map(task => ({
    ...task,
    subtasks: subtasks.filter(s => s.task_id === task.id)
  }));

  const projectsWithTasks = projects.map(project => ({
    ...project,
    tasks: tasksWithSubtasks.filter(t => t.project_id === project.id)
  }));

  res.json(projectsWithTasks);
});

// Create project
router.post('/', (req, res) => {
  const { name, type, color } = req.body;
  const maxOrder = db.prepare('SELECT MAX("order") as max FROM projects').get() as any;
  const order = (maxOrder?.max ?? -1) + 1;

  const result = db.prepare(`
    INSERT INTO projects (name, type, color, "order") VALUES (?, ?, ?, ?)
  `).run(name, type || 'Personal', color || '#3b82f6', order);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(project);
});

// Update project
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, type, color, order } = req.body;

  const updates: string[] = [];
  const values: any[] = [];

  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (type !== undefined) {
    updates.push('type = ?');
    values.push(type);
  }
  if (color !== undefined) {
    updates.push('color = ?');
    values.push(color);
  }
  if (order !== undefined) {
    updates.push('"order" = ?');
    values.push(order);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.json(project);
});

// Delete project
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  res.status(204).send();
});

export default router;
