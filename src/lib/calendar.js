const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const WEEKDAYS_LONG = [
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
  "domingo",
];
const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function weekdayIndex(date = new Date()) {
  return (date.getDay() + 6) % 7;
}

export function cycleDayIndex(daysCount, date = new Date()) {
  if (daysCount === 7) return weekdayIndex(date);
  return (date.getDate() - 1) % daysCount;
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function clockLabel(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function dateLabel(date = new Date()) {
  const index = weekdayIndex(date);
  return `${WEEKDAYS_LONG[index]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

export function nowParts(date = new Date()) {
  const index = weekdayIndex(date);
  return {
    date,
    weekdayIndex: index,
    weekdayName: WEEKDAYS[index],
    greeting: greeting(date),
    clock: clockLabel(date),
    dateLabel: dateLabel(date),
  };
}
