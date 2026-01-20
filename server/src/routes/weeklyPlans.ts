import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// Get weekly plan by week start date (format: YYYY-MM-DD)
router.get('/:weekStart', (req, res) => {
  const { weekStart } = req.params;
  
  let plan = db.prepare('SELECT * FROM weekly_plans WHERE week_start_date = ?').get(weekStart) as any;
  
  // If no plan exists for this week, create an empty one
  if (!plan) {
    const result = db.prepare(`
      INSERT INTO weekly_plans (week_start_date, content) VALUES (?, '')
    `).run(weekStart);
    
    plan = db.prepare('SELECT * FROM weekly_plans WHERE id = ?').get(result.lastInsertRowid);
  }
  
  res.json(plan);
});

// Update weekly plan
router.put('/:weekStart', (req, res) => {
  const { weekStart } = req.params;
  const { content } = req.body;
  
  // Upsert: update if exists, insert if not
  const existing = db.prepare('SELECT id FROM weekly_plans WHERE week_start_date = ?').get(weekStart) as any;
  
  if (existing) {
    db.prepare(`
      UPDATE weekly_plans 
      SET content = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE week_start_date = ?
    `).run(content, weekStart);
  } else {
    db.prepare(`
      INSERT INTO weekly_plans (week_start_date, content) VALUES (?, ?)
    `).run(weekStart, content);
  }
  
  const plan = db.prepare('SELECT * FROM weekly_plans WHERE week_start_date = ?').get(weekStart);
  res.json(plan);
});

export default router;
