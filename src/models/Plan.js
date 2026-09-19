import { all, get, lastId, run } from "../database/connection.js";
import { PLAN_DAYS, defaultCycleNames } from "../lib/cycleNames.js";
import { deleteExercisesForPlan } from "./Exercise.js";
import { getActivePlanId, setActivePlanId } from "./Setting.js";

export function listPlans() {
  const activeId = getActivePlanId();
  return all(
    `
      SELECT
        plans.*,
        (SELECT COUNT(*) FROM cycles WHERE cycles.plan_id = plans.id) AS cycle_count
      FROM plans
      ORDER BY plans.id DESC
    `,
  ).map((plan) => ({ ...plan, active: plan.id === activeId }));
}

export function findPlan(id) {
  const plan = get("SELECT * FROM plans WHERE id = ?", [id]);
  if (!plan) return null;
  return { ...plan, active: plan.id === getActivePlanId() };
}

export function createPlan(name, daysCount) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Dê um nome ao plano.");
  }
  if (!PLAN_DAYS.includes(daysCount)) {
    throw new Error("Escolha 7, 14 ou 28 ciclos.");
  }

  run(
    "INSERT INTO plans (name, days_count, created_at) VALUES (?, ?, ?)",
    [trimmed, daysCount, new Date().toISOString()],
  );

  const id = lastId();
  const names = defaultCycleNames(daysCount);
  names.forEach((cycleName, index) => {
    run(
      `
        INSERT INTO cycles (plan_id, name, day_index, prep_seconds, work_seconds, rest_seconds, rounds)
        VALUES (?, ?, ?, 10, 40, 20, 1)
      `,
      [id, cycleName, index],
    );
  });

  if (!getActivePlanId()) {
    setActivePlanId(id);
  }

  return findPlan(id);
}

export function renamePlan(id, name) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("O plano precisa de um nome.");
  }
  run("UPDATE plans SET name = ? WHERE id = ?", [trimmed, id]);
}

export function activatePlan(id) {
  if (!findPlan(id)) {
    throw new Error("Plano não encontrado.");
  }
  setActivePlanId(id);
}

export function deletePlan(id) {
  deleteExercisesForPlan(id);
  run("DELETE FROM cycles WHERE plan_id = ?", [id]);
  run("DELETE FROM plans WHERE id = ?", [id]);
  if (getActivePlanId() === id) {
    const next = get("SELECT id FROM plans ORDER BY id DESC LIMIT 1");
    setActivePlanId(next ? next.id : null);
  }
}

export function getActivePlan() {
  const id = getActivePlanId();
  return id ? findPlan(id) : null;
}
