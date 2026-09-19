import { get, run } from "../database/connection.js";

export function getSetting(key, fallback = null) {
  const row = get("SELECT value FROM settings WHERE key = ?", [key]);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  run(
    `
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    [key, String(value)],
  );
}

export function getActivePlanId() {
  const value = getSetting("active_plan_id");
  return value ? Number(value) : null;
}

export function setActivePlanId(id) {
  if (id == null) {
    run("DELETE FROM settings WHERE key = ?", ["active_plan_id"]);
    return;
  }
  setSetting("active_plan_id", id);
}
