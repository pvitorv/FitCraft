function columnNames(database, table) {
  const result = database.exec(`PRAGMA table_info(${table})`);
  return result[0]?.values.map((row) => row[1]) ?? [];
}

export function migrate(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      days_count INTEGER NOT NULL CHECK (days_count IN (7, 14, 28)),
      created_at TEXT NOT NULL,
      starts_on TEXT
    );

    CREATE TABLE IF NOT EXISTS cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      day_index INTEGER NOT NULL,
      prep_seconds INTEGER NOT NULL DEFAULT 10,
      work_seconds INTEGER NOT NULL DEFAULT 40,
      rest_seconds INTEGER NOT NULL DEFAULT 20,
      rounds INTEGER NOT NULL DEFAULT 1,
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

    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      mime TEXT NOT NULL DEFAULT 'audio/mpeg',
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      file_key TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tracks_playlist ON tracks(playlist_id, sort_order);

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id INTEGER,
      plan_id INTEGER,
      cycle_name TEXT NOT NULL,
      plan_name TEXT NOT NULL DEFAULT '',
      completed_at TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      exercise_count INTEGER NOT NULL DEFAULT 0,
      rounds INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_done ON sessions(completed_at);

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spent_on TEXT NOT NULL,
      category TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(spent_on);

    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_date TEXT NOT NULL,
      slot TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      UNIQUE(day_date, slot)
    );

    CREATE INDEX IF NOT EXISTS idx_meals_day ON meals(day_date);

    CREATE TABLE IF NOT EXISTS body_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taken_on TEXT NOT NULL,
      weight_kg REAL,
      height_cm REAL,
      chest_cm REAL,
      waist_cm REAL,
      hip_cm REAL,
      arm_cm REAL,
      thigh_cm REAL,
      neck_cm REAL,
      fat_percent REAL,
      note TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_body_logs_date ON body_logs(taken_on);
  `);

  if (!columnNames(database, "cycles").includes("rounds")) {
    database.run("ALTER TABLE cycles ADD COLUMN rounds INTEGER NOT NULL DEFAULT 1");
  }

  [
    ["summer-1", "Summer Eletrohits 1"],
    ["summer-2", "Summer Eletrohits 2"],
    ["summer-3", "Summer Eletrohits 3"],
  ].forEach(([slug, name]) => {
    database.run("INSERT OR IGNORE INTO playlists (slug, name) VALUES (?, ?)", [slug, name]);
  });

  rotateSevenDayPlansToSundayFirst(database);
  convertPlansToWeekBlocks(database);
  fillPlanStartsOn(database);
}

function settingValue(database, key) {
  const rows = database.exec("SELECT value FROM settings WHERE key = '" + key.replace(/'/g, "''") + "'");
  return rows[0]?.values?.[0]?.[0] ?? null;
}

function rotateSevenDayPlansToSundayFirst(database) {
  if (settingValue(database, "week_sunday_first") === "1") return;

  database.run(`
    UPDATE cycles
    SET day_index = day_index + 100
    WHERE plan_id IN (SELECT id FROM plans WHERE days_count = 7)
  `);
  database.run(`
    UPDATE cycles
    SET day_index = (day_index - 100 + 1) % 7
    WHERE day_index >= 100
  `);
  database.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('week_sunday_first', '1')");
}

function tableSql(database, name) {
  const rows = database.exec(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='" + name.replace(/'/g, "''") + "'",
  );
  return rows[0]?.values?.[0]?.[0] ?? "";
}

function convertPlansToWeekBlocks(database) {
  if (settingValue(database, "week_blocks_14_28") === "1") return;

  database.run(`
    DELETE FROM exercises
    WHERE cycle_id IN (
      SELECT id FROM cycles
      WHERE (plan_id IN (SELECT id FROM plans WHERE days_count = 15) AND day_index >= 14)
         OR (plan_id IN (SELECT id FROM plans WHERE days_count = 30) AND day_index >= 28)
    )
  `);
  database.run(`
    DELETE FROM cycles
    WHERE (plan_id IN (SELECT id FROM plans WHERE days_count = 15) AND day_index >= 14)
       OR (plan_id IN (SELECT id FROM plans WHERE days_count = 30) AND day_index >= 28)
  `);

  if (tableSql(database, "plans").includes("15")) {
    database.run("PRAGMA foreign_keys = OFF");
    database.run(`
      CREATE TABLE plans_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        days_count INTEGER NOT NULL CHECK (days_count IN (7, 14, 28)),
        created_at TEXT NOT NULL
      )
    `);
    database.run(`
      INSERT INTO plans_new (id, name, days_count, created_at)
      SELECT
        id,
        name,
        CASE days_count WHEN 15 THEN 14 WHEN 30 THEN 28 ELSE days_count END,
        created_at
      FROM plans
    `);
    database.run("DROP TABLE plans");
    database.run("ALTER TABLE plans_new RENAME TO plans");
    try {
      database.run("DELETE FROM sqlite_sequence WHERE name IN ('plans', 'plans_new')");
      database.run("INSERT INTO sqlite_sequence (name, seq) SELECT 'plans', COALESCE(MAX(id), 0) FROM plans");
    } catch {
      // sqlite_sequence só existe depois do primeiro AUTOINCREMENT
    }
    database.run("PRAGMA foreign_keys = ON");
  }

  database.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('week_blocks_14_28', '1')");
}

function sundayIso(date = new Date()) {
  const sunday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
  const year = sunday.getFullYear();
  const month = String(sunday.getMonth() + 1).padStart(2, "0");
  const day = String(sunday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fillPlanStartsOn(database) {
  if (!columnNames(database, "plans").includes("starts_on")) {
    database.run("ALTER TABLE plans ADD COLUMN starts_on TEXT");
  }
  database.run("UPDATE plans SET starts_on = ? WHERE starts_on IS NULL OR starts_on = ''", [sundayIso()]);
}
