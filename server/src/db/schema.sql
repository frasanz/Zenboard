-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Personal',
  color TEXT DEFAULT '#3b82f6',
  "order" INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATETIME,
  duration_minutes INTEGER DEFAULT 60,
  "order" INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  time_tracked_minutes INTEGER DEFAULT 0,
  tracking_state TEXT DEFAULT 'stopped',
  tracking_started_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Subtasks
CREATE TABLE IF NOT EXISTS subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  completed INTEGER DEFAULT 0,
  "order" INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Weekly Plans
CREATE TABLE IF NOT EXISTS weekly_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start_date TEXT NOT NULL UNIQUE,
  content TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Google Calendar Configuration
CREATE TABLE IF NOT EXISTS google_calendar_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  ical_url TEXT,
  show_events INTEGER DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_week_start ON weekly_plans(week_start_date);
