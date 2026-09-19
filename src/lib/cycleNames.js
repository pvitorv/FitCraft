import { WEEKDAYS } from "./calendar.js";

export const PLAN_DAYS = [7, 14, 28];

export function defaultCycleNames(daysCount) {
  if (daysCount === 7) {
    return [...WEEKDAYS];
  }

  return Array.from({ length: daysCount }, (_, index) => {
    const weekday = WEEKDAYS[index % 7];
    const week = Math.floor(index / 7) + 1;
    return `${weekday} · ${String(index + 1).padStart(2, "0")} · sem. ${week}`;
  });
}

export function daysLabel(daysCount) {
  if (daysCount === 7) return "Semanal";
  if (daysCount === 14) return "2 semanas";
  return "4 semanas";
}
