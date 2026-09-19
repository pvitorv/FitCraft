export function migrate(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      days_count INTEGER NOT NULL CHECK (days_count IN (7, 15, 30)),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      day_index INTEGER NOT NULL,
      prep_seconds INTEGER NOT NULL DEFAULT 10,
      work_seconds INTEGER NOT NULL DEFAULT 40,
      rest_seconds INTEGER NOT NULL DEFAULT 20,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_cycles_plan ON cycles(plan_id, day_index);

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      work_seconds INTEGER NOT NULL DEFAULT 40,
      FOREIGN KEY (cycle_id) REFERENCES cycles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_exercises_cycle ON exercises(cycle_id, sort_order);
  `);
}
