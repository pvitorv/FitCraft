import { escapeHtml } from "../lib/html.js";
import { icons } from "../lib/icons.js";
import { cycleDuration, formatClock } from "../lib/time.js";
import { cycleRounds, findCycle, renameCycle, setCycleRounds, setCycleTimes } from "../models/Cycle.js";
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

function stepper(kind, value, extra = "", format = "clock") {
  const shown = format === "clock" ? formatClock(value) : `${value}×`;
  const step = format === "clock" ? 5 : 1;
  return `
    <div class="stepper" data-kind="${kind}" ${extra}>
      <button type="button" data-delta="-${step}" aria-label="Diminuir">−</button>
      <strong>${shown}</strong>
      <button type="button" data-delta="${step}" aria-label="Aumentar">+</button>
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
  const rounds = cycleRounds(cycle);
  const total = cycleDuration(cycle, exercises);

  return {
    html: `
      <button class="back-link" data-go="/planos/${plan.id}">${icons.back} ${escapeHtml(plan.name)}</button>
      <article class="hero">
        <div class="kicker"><span class="dot"></span> Ciclo ${String(cycle.day_index + 1).padStart(2, "0")}</div>
        <label class="plan-title-field">
          <span class="sr-only">Nome do ciclo</span>
          <input id="cycle-name" maxlength="60" value="${escapeHtml(cycle.name)}" />
        </label>
        <p>A preparação acontece uma vez, só no começo. Depois o circuito é só treino e intervalo, quantas séries você marcar.</p>
        <p class="muted">Duração estimada: <strong>${formatClock(total)}</strong>${rounds > 1 ? ` · ${rounds} séries` : ""}</p>
      </article>

      <article class="card rounds-card">
        <div>
          <small>Repetições da sequência</small>
          <strong>Quantas vezes o circuito roda</strong>
          <p class="muted">Depois da preparação: treino → intervalo → treino → intervalo… Sem voltar à preparação no fim da série.</p>
        </div>
        ${stepper("rounds", rounds, "", "count")}
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
          <p>Cada movimento tem o próprio tempo. A preparação não se repete.</p>
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
                    <li class="exercise-card" data-card="${exercise.id}">
                      <div class="exercise-head">
                        <span class="cycle-index">${String(index + 1).padStart(2, "0")}</span>
                        <p class="exercise-title" data-title-for="${exercise.id}">${escapeHtml(exercise.name)}</p>
                      </div>
                      <label class="exercise-editor">
                        <span>Nome do exercício</span>
                        <textarea
                          class="exercise-name"
                          data-exercise-id="${exercise.id}"
                          maxlength="120"
                          rows="3"
                          placeholder="Ex.: Agachamento com salto e toque no chão"
                          aria-label="Nome do exercício ${index + 1}"
                        >${escapeHtml(exercise.name)}</textarea>
                      </label>
                      <div class="exercise-actions">
                        <button type="button" class="btn btn-ghost" data-edit="${exercise.id}">${icons.edit} Editar</button>
                        <button type="button" class="btn btn-danger" data-delete="${exercise.id}">${icons.trash} Apagar</button>
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
          if (kind === "rounds") {
            setCycleRounds(cycle.id, rounds + delta);
          } else if (kind === "prep") {
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
        const created = addExercise(cycle.id);
        sessionStorage.setItem("fitcraft.editExercise", String(created.id));
        reload();
      });

      const openEditor = (id) => {
        const card = root.querySelector(`[data-card="${id}"]`);
        if (!card) return;
        card.classList.add("is-editing");
        const field = card.querySelector(".exercise-name");
        field?.focus();
        field?.setSelectionRange(field.value.length, field.value.length);
      };

      const pendingEdit = sessionStorage.getItem("fitcraft.editExercise");
      if (pendingEdit) {
        sessionStorage.removeItem("fitcraft.editExercise");
        openEditor(Number(pendingEdit));
      }

      root.querySelectorAll("[data-edit]").forEach((button) => {
        button.addEventListener("click", () => {
          const card = button.closest(".exercise-card");
          const field = card.querySelector(".exercise-name");
          if (card.classList.contains("is-editing")) {
            field.dispatchEvent(new Event("change"));
            card.classList.remove("is-editing");
            button.innerHTML = `${icons.edit} Editar`;
            return;
          }
          root.querySelectorAll(".exercise-card").forEach((other) => {
            other.classList.remove("is-editing");
            const otherBtn = other.querySelector("[data-edit]");
            if (otherBtn) otherBtn.innerHTML = `${icons.edit} Editar`;
          });
          openEditor(Number(button.dataset.edit));
          button.innerHTML = "Salvar nome";
        });
      });

      root.querySelectorAll(".exercise-name").forEach((input) => {
        input.addEventListener("change", () => {
          try {
            renameExercise(Number(input.dataset.exerciseId), input.value);
            const title = root.querySelector(`[data-title-for="${input.dataset.exerciseId}"]`);
            if (title) title.textContent = input.value.trim();
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
