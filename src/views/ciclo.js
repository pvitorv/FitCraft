import { escapeHtml } from "../lib/html.js";
import { icons } from "../lib/icons.js";
import { cycleDuration, formatClock } from "../lib/time.js";
import { findCycle, setCycleTimes, renameCycle } from "../models/Cycle.js";
import {
  addExercise,
  deleteExercise,
  listExercises,
  moveExercise,
  renameExercise,
  setExerciseWork,
} from "../models/Exercise.js";
import { findPlan } from "../models/Plan.js";
import { go } from "../routes.js";

function stepper(kind, seconds, extra = "") {
  return `
    <div class="stepper" data-kind="${kind}" ${extra}>
      <button type="button" data-delta="-5" aria-label="Diminuir">−</button>
      <strong>${formatClock(seconds)}</strong>
      <button type="button" data-delta="5" aria-label="Aumentar">+</button>
    </div>
  `;
}

export async function cicloScreen({ id, cycleId }) {
  const plan = findPlan(id);
  const cycle = findCycle(cycleId);

  if (!plan || !cycle || cycle.plan_id !== plan.id) {
    return {
      html: `
        <div class="empty">
          <h3>Ciclo não encontrado</h3>
          <button class="btn btn-ghost" data-go="/planos">Voltar aos planos</button>
        </div>
      `,
    };
  }

  const exercises = listExercises(cycle.id);
  const nextName = exercises[1]?.name ?? "Próximo exercício";
  const total = cycleDuration(cycle, exercises);

  return {
    html: `
      <button class="back-link" data-go="/planos/${plan.id}">${icons.back} ${escapeHtml(plan.name)}</button>
      <article class="hero">
        <div class="kicker"><span class="dot"></span> Ciclo ${String(cycle.day_index + 1).padStart(2, "0")}</div>
        <label class="plan-title-field">
          <span class="sr-only">Nome do ciclo</span>
          <input id="cycle-name" maxlength="32" value="${escapeHtml(cycle.name)}" />
        </label>
        <p>Preparação e intervalo valem para o dia todo. Cada exercício tem o próprio tempo de treino.</p>
        <p class="muted">Duração estimada: <strong>${formatClock(total)}</strong></p>
      </article>

      <div class="grid cols-3" style="margin-top:16px">
        <article class="card phase-prep">
          <small>Preparação</small>
          <strong>${escapeHtml(exercises[0]?.name ?? "1º exercício")}</strong>
          ${stepper("prep", cycle.prep_seconds)}
        </article>
        <article class="card phase-train">
          <small>Treino</small>
          <strong>Por exercício</strong>
          <p>Ajuste o tempo vermelho em cada movimento abaixo.</p>
        </article>
        <article class="card phase-rest">
          <small>Intervalo</small>
          <strong>${escapeHtml(nextName)}</strong>
          ${stepper("rest", cycle.rest_seconds)}
        </article>
      </div>

      <div class="section-head">
        <h3 class="section-title">Exercícios</h3>
        <button class="btn btn-primary" type="button" id="add-exercise">${icons.plus} Adicionar</button>
      </div>
      ${
        exercises.length
          ? `<ol class="exercise-list">
              ${exercises
                .map(
                  (exercise, index) => `
                    <li class="exercise-card">
                      <div class="exercise-top">
                        <span class="cycle-index">${String(index + 1).padStart(2, "0")}</span>
                        <input
                          class="exercise-name"
                          data-exercise-id="${exercise.id}"
                          maxlength="32"
                          value="${escapeHtml(exercise.name)}"
                          aria-label="Nome do exercício ${index + 1}"
                        />
                        <button type="button" class="icon-btn" data-delete="${exercise.id}" aria-label="Apagar">${icons.trash}</button>
                      </div>
                      <div class="exercise-meta">
                        ${stepper("work", exercise.work_seconds, `data-exercise-id="${exercise.id}"`)}
                        <div class="move-row">
                          <button type="button" class="btn btn-ghost" data-move="${exercise.id}" data-dir="-1">↑</button>
                          <button type="button" class="btn btn-ghost" data-move="${exercise.id}" data-dir="1">↓</button>
                        </div>
                      </div>
                    </li>
                  `,
                )
                .join("")}
            </ol>`
          : `<div class="empty">
              <div class="empty-icon">${icons.dumbbell}</div>
              <h3>Nenhum exercício</h3>
              <p>Adicione os movimentos deste dia. O primeiro aparece na preparação.</p>
            </div>`
      }
    `,
    bind(root) {
      const reload = () => go(`/planos/${plan.id}/ciclos/${cycle.id}`);

      root.querySelector("#cycle-name").addEventListener("change", (event) => {
        try {
          renameCycle(cycle.id, event.target.value);
        } catch (error) {
          event.target.value = cycle.name;
          alert(error.message);
        }
      });

      root.querySelectorAll(".stepper button").forEach((button) => {
        button.addEventListener("click", () => {
          const stepperEl = button.closest(".stepper");
          const delta = Number(button.dataset.delta);
          const kind = stepperEl.dataset.kind;
          if (kind === "prep") {
            setCycleTimes(cycle.id, {
              prepSeconds: cycle.prep_seconds + delta,
              restSeconds: cycle.rest_seconds,
            });
          } else if (kind === "rest") {
            setCycleTimes(cycle.id, {
              prepSeconds: cycle.prep_seconds,
              restSeconds: cycle.rest_seconds + delta,
            });
          } else {
            const exercise = exercises.find(
              (item) => item.id === Number(stepperEl.dataset.exerciseId),
            );
            if (exercise) {
              setExerciseWork(exercise.id, exercise.work_seconds + delta);
            }
          }
          reload();
        });
      });

      root.querySelector("#add-exercise")?.addEventListener("click", () => {
        addExercise(cycle.id);
        reload();
      });

      root.querySelectorAll(".exercise-name").forEach((input) => {
        input.addEventListener("change", () => {
          try {
            renameExercise(Number(input.dataset.exerciseId), input.value);
          } catch (error) {
            alert(error.message);
            reload();
          }
        });
      });

      root.querySelectorAll("[data-delete]").forEach((button) => {
        button.addEventListener("click", () => {
          deleteExercise(Number(button.dataset.delete));
          reload();
        });
      });

      root.querySelectorAll("[data-move]").forEach((button) => {
        button.addEventListener("click", () => {
          moveExercise(Number(button.dataset.move), Number(button.dataset.dir));
          reload();
        });
      });
    },
  };
}
