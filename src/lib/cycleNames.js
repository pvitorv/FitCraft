const WEEKDAYS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

export function defaultCycleNames(daysCount) {
  if (daysCount === 7) {
    return [...WEEKDAYS];
  }

  return Array.from(
    { length: daysCount },
    (_, index) => `Dia ${String(index + 1).padStart(2, "0")}`,
  );
}

export function daysLabel(daysCount) {
  if (daysCount === 7) return "Semanal";
  if (daysCount === 15) return "Quinzenal";
  return "Mensal";
}
