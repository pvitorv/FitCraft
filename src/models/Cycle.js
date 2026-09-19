import { all, get, run } from "../database/connection.js";

export function listCycles(planId) {
  return all(
    "SELECT * FROM cycles WHERE plan_id = ? ORDER BY day_index ASC",
    [planId],
  );
}

export function firstCycle(planId) {
  return get(
    "SELECT * FROM cycles WHERE plan_id = ? ORDER BY day_index ASC LIMIT 1",
    [planId],
  );
}

export function renameCycle(id, name) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("O ciclo precisa de um nome.");
  }
  run("UPDATE cycles SET name = ? WHERE id = ?", [trimmed, id]);
}
