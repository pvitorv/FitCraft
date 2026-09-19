import { all, get, lastId, run } from "../database/connection.js";
import { clampSeconds } from "../lib/time.js";

export function listExercises(cycleId) {
  return all(
    "SELECT * FROM exercises WHERE cycle_id = ? ORDER BY sort_order ASC, id ASC",
    [cycleId],
  );
}

export function firstExercise(cycleId) {
  return get(
    "SELECT * FROM exercises WHERE cycle_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1",
    [cycleId],
  );
}

export function findExercise(id) {
  return get("SELECT * FROM exercises WHERE id = ?", [id]);
}

export function addExercise(cycleId, name = "") {
  const count = get(
    "SELECT COUNT(*) AS total FROM exercises WHERE cycle_id = ?",
    [cycleId],
  ).total;
  const label = name.trim() || `Exercício ${count + 1}`;
  const nextOrder = get(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM exercises WHERE cycle_id = ?",
    [cycleId],
  ).next;

  run(
    "INSERT INTO exercises (cycle_id, name, sort_order, work_seconds) VALUES (?, ?, ?, 40)",
    [cycleId, label, nextOrder],
  );
  return findExercise(lastId());
}

export function renameExercise(id, name) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("O exercício precisa de um nome.");
  }
  run("UPDATE exercises SET name = ? WHERE id = ?", [trimmed, id]);
}

export function setExerciseWork(id, seconds) {
  run("UPDATE exercises SET work_seconds = ? WHERE id = ?", [
    clampSeconds(seconds, 5, 1800),
    id,
  ]);
}

export function deleteExercise(id) {
  run("DELETE FROM exercises WHERE id = ?", [id]);
}

export function moveExercise(id, direction) {
  const exercise = findExercise(id);
  if (!exercise) return;

  const neighbor = get(
    direction < 0
      ? `
        SELECT * FROM exercises
        WHERE cycle_id = ? AND sort_order < ?
        ORDER BY sort_order DESC LIMIT 1
      `
      : `
        SELECT * FROM exercises
        WHERE cycle_id = ? AND sort_order > ?
        ORDER BY sort_order ASC LIMIT 1
      `,
    [exercise.cycle_id, exercise.sort_order],
  );

  if (!neighbor) return;

  run("UPDATE exercises SET sort_order = ? WHERE id = ?", [neighbor.sort_order, exercise.id]);
  run("UPDATE exercises SET sort_order = ? WHERE id = ?", [exercise.sort_order, neighbor.id]);
}

export function deleteExercisesForPlan(planId) {
  run(
    `
      DELETE FROM exercises
      WHERE cycle_id IN (SELECT id FROM cycles WHERE plan_id = ?)
    `,
    [planId],
  );
}
