import { all, get, run } from "../database/connection.js";
import { cycleDayIndex } from "../lib/calendar.js";
import { clampSeconds } from "../lib/time.js";

export function listCycles(planId) {
  return all(
    `
      SELECT
        cycles.*,
        (SELECT COUNT(*) FROM exercises WHERE exercises.cycle_id = cycles.id) AS exercise_count
      FROM cycles
      WHERE plan_id = ?
      ORDER BY day_index ASC
    `,
    [planId],
  );
}

export function firstCycle(planId) {
  return get(
    "SELECT * FROM cycles WHERE plan_id = ? ORDER BY day_index ASC LIMIT 1",
    [planId],
  );
}

export function firstTrainableCycle(planId) {
  return (
    listCycles(planId).find((cycle) => cycle.exercise_count > 0) ?? firstCycle(planId)
  );
}

export function cycleForToday(plan, date = new Date()) {
  if (!plan) return null;
  const cycles = listCycles(plan.id);
  const index = cycleDayIndex(plan.days_count, date);
  return cycles.find((cycle) => cycle.day_index === index) ?? firstCycle(plan.id);
}

export function findCycle(id) {
  return get(
    `
      SELECT
        cycles.*,
        (SELECT COUNT(*) FROM exercises WHERE exercises.cycle_id = cycles.id) AS exercise_count
      FROM cycles
      WHERE id = ?
    `,
    [id],
  );
}

export function renameCycle(id, name) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("O ciclo precisa de um nome.");
  }
  run("UPDATE cycles SET name = ? WHERE id = ?", [trimmed, id]);
}

export function setCycleTimes(id, { prepSeconds, restSeconds }) {
  run("UPDATE cycles SET prep_seconds = ?, rest_seconds = ? WHERE id = ?", [
    clampSeconds(prepSeconds, 3, 600),
    clampSeconds(restSeconds, 5, 600),
    id,
  ]);
}

export function setCycleRounds(id, rounds) {
  const value = Math.min(30, Math.max(1, Math.round(Number(rounds) || 1)));
  run("UPDATE cycles SET rounds = ? WHERE id = ?", [value, id]);
}

export function cycleRounds(cycle) {
  return Math.min(30, Math.max(1, Number(cycle?.rounds) || 1));
}
