import { all, get, run } from "../database/connection.js";
import { addDays, isoDate, startOfWeek, weekdayIndex } from "../lib/calendar.js";
import { cycleForToday } from "./Cycle.js";
import { getActivePlan } from "./Plan.js";

export const MEAL_SLOTS = [
  { id: "cafe", label: "Café da manhã" },
  { id: "lanche1", label: "Lanche da manhã" },
  { id: "almoco", label: "Almoço" },
  { id: "lanche2", label: "Lanche da tarde" },
  { id: "jantar", label: "Jantar" },
  { id: "ceia", label: "Ceia" },
];

export function listMealsOn(dayDate) {
  return all("SELECT * FROM meals WHERE day_date = ? ORDER BY id ASC", [dayDate]);
}

export function mealMapOn(dayDate) {
  const map = {};
  MEAL_SLOTS.forEach((slot) => {
    map[slot.id] = { slot: slot.id, title: "", notes: "", day_date: dayDate };
  });
  listMealsOn(dayDate).forEach((meal) => {
    map[meal.slot] = meal;
  });
  return map;
}

export function upsertMeal(dayDate, slot, { title, notes }) {
  const allowed = MEAL_SLOTS.some((item) => item.id === slot);
  if (!allowed) throw new Error("Refeição inválida.");
  const existing = get("SELECT * FROM meals WHERE day_date = ? AND slot = ?", [dayDate, slot]);
  const cleanTitle = String(title || "").trim().slice(0, 80);
  const cleanNotes = String(notes || "").trim().slice(0, 160);
  if (!cleanTitle && !cleanNotes) {
    if (existing) run("DELETE FROM meals WHERE id = ?", [existing.id]);
    return null;
  }
  if (existing) {
    run("UPDATE meals SET title = ?, notes = ? WHERE id = ?", [cleanTitle, cleanNotes, existing.id]);
    return get("SELECT * FROM meals WHERE id = ?", [existing.id]);
  }
  run(
    "INSERT INTO meals (day_date, slot, title, notes) VALUES (?, ?, ?, ?)",
    [dayDate, slot, cleanTitle, cleanNotes],
  );
  return get("SELECT * FROM meals WHERE day_date = ? AND slot = ?", [dayDate, slot]);
}

export function weekPlan(anchor = new Date()) {
  const start = startOfWeek(anchor);
  const plan = getActivePlan();
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const key = isoDate(date);
    const meals = mealMapOn(key);
    const filled = MEAL_SLOTS.filter((slot) => meals[slot.id]?.title).length;
    const cycle = plan ? cycleForToday(plan, date) : null;
    return {
      date: key,
      weekdayIndex: index,
      dateObj: date,
      meals,
      filled,
      cycle,
    };
  });
}

export function monthPlan(anchor = new Date()) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const days = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const plan = getActivePlan();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(anchor.getFullYear(), anchor.getMonth(), index + 1);
    const key = isoDate(date);
    const meals = mealMapOn(key);
    const filled = MEAL_SLOTS.filter((slot) => meals[slot.id]?.title).length;
    return {
      date: key,
      weekdayIndex: weekdayIndex(date),
      dateObj: date,
      meals,
      filled,
      cycle: plan ? cycleForToday(plan, date) : null,
    };
  });
}

export function copyWeek(fromAnchor, toAnchor) {
  const source = weekPlan(fromAnchor);
  const targetStart = startOfWeek(toAnchor);
  source.forEach((day, index) => {
    const dest = isoDate(addDays(targetStart, index));
    MEAL_SLOTS.forEach((slot) => {
      const meal = day.meals[slot.id];
      upsertMeal(dest, slot.id, { title: meal?.title || "", notes: meal?.notes || "" });
    });
  });
}
