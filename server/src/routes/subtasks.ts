import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// Create subtask
router.post('/', (req, res) => {
  const { task_id, title } = req.body;

  const maxOrder = db.prepare(
    'SELECT MAX("order") as max FROM subtasks WHERE task_id = ?'
  ).get(task_id) as any;
  const order = (maxOrder?.max ?? -1) + 1;

  const result = db.prepare(`
    INSERT INTO subtasks (task_id, title, "order") VALUES (?, ?, ?)
  `).run(task_id, title, order);

  const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(subtask);
});

// Update subtask
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { title, notes, completed, order, task_id } = req.body;

  const updates: string[] = [];
  const values: any[] = [];

  if (title !== undefined) {
    updates.push('title = ?');
    values.push(title);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    values.push(notes);
  }
  if (completed !== undefined) {
    updates.push('completed = ?');
    values.push(completed ? 1 : 0);
  }
  if (order !== undefined) {
    updates.push('"order" = ?');
    values.push(order);
  }
  if (task_id !== undefined) {
    updates.push('task_id = ?');
    values.push(task_id);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  db.prepare(`UPDATE subtasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
  res.json(subtask);
});

// Delete subtask
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  res.status(204).send();
});

export default router;
