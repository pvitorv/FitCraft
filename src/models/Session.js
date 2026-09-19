import { all, get, run } from "../database/connection.js";
import { cycleRounds } from "./Cycle.js";
import { isoDate, startOfWeek } from "../lib/calendar.js";

export function logCompletedSession({ cycle, plan, durationSeconds, exerciseCount }) {
  if (!cycle) return null;
  const now = new Date();
  const windowStart = new Date(now.getTime() - 90 * 1000).toISOString();
  const recent = get(
    `
      SELECT id FROM sessions
      WHERE cycle_id = ? AND completed_at >= ?
      ORDER BY id DESC LIMIT 1
    `,
    [cycle.id, windowStart],
  );
  if (recent) return recent;

  run(
    `
      INSERT INTO sessions (
        cycle_id, plan_id, cycle_name, plan_name, completed_at,
        duration_seconds, exercise_count, rounds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      cycle.id,
      plan?.id ?? cycle.plan_id,
      cycle.name,
      plan?.name ?? "",
      now.toISOString(),
      Math.max(0, Math.round(Number(durationSeconds) || 0)),
      exerciseCount,
      cycleRounds(cycle),
    ],
  );
  return get("SELECT * FROM sessions ORDER BY id DESC LIMIT 1");
}

export function listSessions(limit = 60) {
  return all("SELECT * FROM sessions ORDER BY completed_at DESC LIMIT ?", [limit]);
}

export function sessionsBetween(fromIso, toIso) {
  return all(
    `
      SELECT * FROM sessions
      WHERE completed_at >= ? AND completed_at < ?
      ORDER BY completed_at ASC
    `,
    [fromIso, toIso],
  );
}

export function sessionStats(date = new Date()) {
  const today = isoDate(date);
  const weekStart = startOfWeek(date);
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const weekSessions = sessionsBetween(weekStart.toISOString(), addDayIso(weekStart, 7));
  const monthSessions = sessionsBetween(monthStart.toISOString(), nextMonth.toISOString());
  const allRecent = all("SELECT completed_at FROM sessions ORDER BY completed_at DESC LIMIT 400");
  const byDay = new Map();
  allRecent.forEach((row) => {
    const key = isoDate(new Date(row.completed_at));
    byDay.set(key, (byDay.get(key) || 0) + 1);
  });
  return {
    todayCount: byDay.get(today) || 0,
    weekCount: weekSessions.length,
    monthCount: monthSessions.length,
    weekMinutes: Math.round(weekSessions.reduce((sum, row) => sum + row.duration_seconds, 0) / 60),
    monthMinutes: Math.round(monthSessions.reduce((sum, row) => sum + row.duration_seconds, 0) / 60),
    streak: currentStreak(byDay, date),
    byDay,
    weekdayCounts: weekdayCounts(weekSessions),
  };
}

function addDayIso(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function currentStreak(byDay, date) {
  let streak = 0;
  const cursor = new Date(date);
  cursor.setHours(0, 0, 0, 0);
  if (!byDay.get(isoDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (byDay.get(isoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function weekdayCounts(rows) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  rows.forEach((row) => {
    const date = new Date(row.completed_at);
    counts[(date.getDay() + 6) % 7] += 1;
  });
  return counts;
}

export function heatmapDays(days = 35, date = new Date()) {
  const stats = sessionStats(date);
  const items = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const cursor = new Date(date);
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() - offset);
    const key = isoDate(cursor);
    items.push({
      date: key,
      count: stats.byDay.get(key) || 0,
      weekday: (cursor.getDay() + 6) % 7,
    });
  }
  return { ...stats, items };
}
