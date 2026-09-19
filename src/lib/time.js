export function clampSeconds(value, min = 5, max = 1800) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function formatClock(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function cycleDuration(cycle, exercises) {
  const work = exercises.reduce((sum, exercise) => sum + exercise.work_seconds, 0);
  const rests = Math.max(0, exercises.length - 1) * cycle.rest_seconds;
  return cycle.prep_seconds + work + rests;
}
