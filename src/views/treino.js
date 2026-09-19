import { escapeHtml } from "../lib/html.js";
import { formatClock } from "../lib/time.js";
import { firstCycle } from "../models/Cycle.js";
import { firstExercise } from "../models/Exercise.js";
import { getActivePlan } from "../models/Plan.js";

export async function treinoScreen() {
  const plan = getActivePlan();
  const cycle = plan ? firstCycle(plan.id) : null;
  const exercise = cycle ? firstExercise(cycle.id) : null;

  return {
    html: `
      <div class="timer-preview">
        <div class="phase-label">PREPARAÇÃO</div>
        <div class="ring">
          <div class="ring-inner">
            <div class="clock">${cycle ? formatClock(cycle.prep_seconds) : "00:10"}</div>
          </div>
        </div>
        <div class="exercise-name">${exercise ? escapeHtml(exercise.name) : "Burpee"}</div>
        <p class="muted">Prévia visual. O temporizador de verdade entra na 005.</p>
        <div class="controls">
          <button class="btn btn-ghost" disabled>Pular</button>
          <button class="btn btn-primary" disabled>Pausar timer</button>
          <button class="btn btn-ghost" disabled>Música</button>
        </div>
      </div>
    `,
  };
}
