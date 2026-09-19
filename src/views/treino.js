import { escapeHtml } from "../lib/html.js";
import { icons } from "../lib/icons.js";
import { formatClock } from "../lib/time.js";
import { findCycle, firstTrainableCycle, listCycles } from "../models/Cycle.js";
import { listExercises } from "../models/Exercise.js";
import { getActivePlan } from "../models/Plan.js";
import { playCues, resetCues, unlockCues } from "../services/cues.js";
import { cycleSignature, timerEngine } from "../services/timerEngine.js";
import { keepAwake, releaseAwake } from "../services/wakeLock.js";
import { go } from "../routes.js";

let unsubscribe = null;

function ringStyle(snapshot) {
  const color =
    snapshot.phase?.type === "work"
      ? "#ff1a1a"
      : snapshot.phase?.type === "rest"
        ? "#1f5cff"
        : "#ffd400";
  const percent = Math.max(2, Math.round((snapshot.progress || 0) * 100));
  return `conic-gradient(${color} ${percent}%, rgba(255,255,255,0.08) 0)`;
}

function paint(root, snapshot, exercises) {
  const stage = root.querySelector("[data-timer]");
  if (!stage) return;

  const phase = snapshot.phase;
  stage.className = `timer-stage is-${phase?.type ?? "idle"} ${snapshot.running ? "is-running" : "is-paused"} ${snapshot.ended ? "is-done" : ""}`;
  root.querySelector("[data-phase]").textContent = snapshot.ended
    ? "FIM"
    : (phase?.label ?? "TREINO").toUpperCase();
  root.querySelector("[data-clock]").textContent = snapshot.ended
    ? "00:00"
    : formatClock(snapshot.displaySeconds);
  root.querySelector("[data-title]").textContent = snapshot.ended
    ? "Treino concluído"
    : (phase?.title ?? "Monte os exercícios");
  root.querySelector("[data-hint]").textContent = snapshot.ended
    ? "Bom trabalho. Pode recomeçar ou escolher outro ciclo."
    : (phase?.hint ?? "Adicione exercícios neste ciclo para começar.");
  root.querySelector("[data-ring]").style.background = ringStyle(snapshot);
  root.querySelector("[data-progress]").textContent = snapshot.ended
    ? "Sessão completa"
    : phase?.rounds > 1
      ? `Fase ${snapshot.index + 1} de ${snapshot.total} · série ${phase.round} de ${phase.rounds}`
      : `Fase ${snapshot.index + 1} de ${snapshot.total || 1}`;

  const main = root.querySelector("[data-main]");
  if (snapshot.ended) main.textContent = "Recomeçar";
  else if (snapshot.running) main.textContent = "Pausar timer";
  else if (snapshot.index === 0 && snapshot.remainingMs === (phase?.seconds ?? 0) * 1000)
    main.textContent = "Iniciar";
  else main.textContent = "Continuar";

  root.querySelector("[data-skip]").disabled = snapshot.ended || !snapshot.total;
  root.querySelector("[data-main]").disabled = !snapshot.total;

  root.querySelectorAll("[data-ex]").forEach((item) => {
    const index = Number(item.dataset.ex);
    const current =
      phase?.type === "prep"
        ? 0
        : phase?.type === "work"
          ? phase.exerciseIndex
          : phase?.type === "rest"
            ? (phase.exerciseIndex + 1) % Math.max(exercises.length, 1)
            : -1;
    item.classList.toggle("is-current", !snapshot.ended && index === current);
    item.classList.toggle("is-done", (phase?.rounds ?? 1) <= 1 && (snapshot.ended || index < current));
  });

  playCues(snapshot);
}

export async function treinoScreen(params) {
  const plan = getActivePlan();
  const cycles = plan ? listCycles(plan.id) : [];
  const requested = params.cycleId ? findCycle(params.cycleId) : null;
  const cycle =
    requested && plan && requested.plan_id === plan.id
      ? requested
      : plan
        ? firstTrainableCycle(plan.id)
        : null;
  const exercises = cycle ? listExercises(cycle.id) : [];

  if (cycle) {
    const snap = timerEngine.snapshot();
    const signature = cycleSignature(cycle, exercises);
    if (!snap.running && (snap.cycleId !== cycle.id || snap.signature !== signature || !snap.phases.length)) {
      timerEngine.load(cycle, exercises);
      resetCues();
    }
  }

  return {
    html: cycle
      ? `
        <div class="timer-wrap">
          <div class="timer-toolbar">
            <label class="field compact">
              <span>Ciclo de hoje</span>
              <select id="cycle-pick">
                ${cycles
                  .map(
                    (item) => `
                      <option value="${item.id}" ${item.id === cycle.id ? "selected" : ""}>
                        ${escapeHtml(item.name)} · ${item.exercise_count} ex.
                      </option>
                    `,
                  )
                  .join("")}
              </select>
            </label>
            <p class="muted" data-progress>Fase 1</p>
          </div>
          <section class="timer-stage is-prep" data-timer>
            <div class="phase-label" data-phase>PREPARAÇÃO</div>
            <div class="ring" data-ring>
              <div class="ring-inner">
                <div class="clock" data-clock>${formatClock(cycle.prep_seconds)}</div>
              </div>
            </div>
            <div class="exercise-name" data-title>${escapeHtml(exercises[0]?.name ?? "Sem exercícios")}</div>
            <p class="muted" data-hint>O timer e a música terão pauses separados. Música entra na 006.</p>
            <div class="controls">
              <button class="btn btn-ghost" type="button" data-skip>Pular</button>
              <button class="btn btn-primary" type="button" data-main ${exercises.length ? "" : "disabled"}>Iniciar</button>
              <button class="btn btn-ghost" type="button" disabled>Música</button>
            </div>
          </section>
          <ol class="queue">
            ${exercises
              .map(
                (exercise, index) => `
                  <li data-ex="${index}">
                    <span>${String(index + 1).padStart(2, "0")}</span>
                    <strong>${escapeHtml(exercise.name)}</strong>
                    <em>${formatClock(exercise.work_seconds)}</em>
                  </li>
                `,
              )
              .join("")}
          </ol>
        </div>
      `
      : `
        <div class="empty">
          <div class="empty-icon">${icons.timer}</div>
          <h3>Nada para treinar</h3>
          <p>Crie um plano, abra um ciclo e adicione pelo menos um exercício.</p>
          <button class="btn btn-primary" data-go="/planos">Ir aos planos</button>
        </div>
      `,
    bind(root) {
      unsubscribe?.();
      if (!cycle) return;

      unsubscribe = timerEngine.subscribe((snapshot) => paint(root, snapshot, exercises));

      root.querySelector("#cycle-pick")?.addEventListener("change", (event) => {
        const nextId = Number(event.target.value);
        if (nextId === cycle.id) return;
        if (timerEngine.snapshot().running) timerEngine.pause();
        timerEngine.load(findCycle(nextId), listExercises(nextId));
        resetCues();
        releaseAwake();
        go(`/treino/${nextId}`);
      });

      root.querySelector("[data-main]")?.addEventListener("click", () => {
        unlockCues();
        const snap = timerEngine.snapshot();
        if (snap.ended) {
          timerEngine.reset();
          resetCues();
          releaseAwake();
          return;
        }
        timerEngine.toggle();
        if (timerEngine.snapshot().running) keepAwake();
        else releaseAwake();
      });

      root.querySelector("[data-skip]")?.addEventListener("click", () => {
        unlockCues();
        timerEngine.skip();
        if (!timerEngine.snapshot().running) releaseAwake();
      });
    },
  };
}
