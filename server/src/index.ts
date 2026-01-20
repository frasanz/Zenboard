import express from 'express';
import cors from 'cors';
import projectsRouter from './routes/projects.js';
import tasksRouter from './routes/tasks.js';
import subtasksRouter from './routes/subtasks.js';
import weeklyPlansRouter from './routes/weeklyPlans.js';
import googleCalendarRouter from './routes/googleCalendar.js';
import db from './db/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/subtasks', subtasksRouter);
app.use('/api/weekly-plans', weeklyPlansRouter);
app.use('/api/google-calendar', googleCalendarRouter);

// Batch reorder endpoint
app.put('/api/reorder', (req, res) => {
  const { items } = req.body;
  // items: [{ type: 'project' | 'task' | 'subtask', id: number, order: number, parent_id?: number }]

  const updateProject = db.prepare('UPDATE projects SET "order" = ? WHERE id = ?');
  const updateTask = db.prepare('UPDATE tasks SET "order" = ?, project_id = ? WHERE id = ?');
  const updateSubtask = db.prepare('UPDATE subtasks SET "order" = ?, task_id = ? WHERE id = ?');

  const transaction = db.transaction((items: any[]) => {
    for (const item of items) {
      switch (item.type) {
        case 'project':
          updateProject.run(item.order, item.id);
          break;
        case 'task':
          updateTask.run(item.order, item.parent_id, item.id);
          break;
        case 'subtask':
          updateSubtask.run(item.order, item.parent_id, item.id);
          break;
      }
    }
  });

  try {
    transaction(items);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder items' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
