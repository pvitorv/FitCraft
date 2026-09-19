import { daysLabel } from "../lib/cycleNames.js";
import { escapeHtml } from "../lib/html.js";
import { icons } from "../lib/icons.js";
import { formatClock } from "../lib/time.js";
import { cycleRounds, firstCycle, firstTrainableCycle } from "../models/Cycle.js";
import { listExercises } from "../models/Exercise.js";
import { getActivePlan } from "../models/Plan.js";
import { go } from "../routes.js";
import { anyBorrowableCycle, openBorrowModal } from "./borrowModal.js";

export async function homeScreen() {
  const plan = getActivePlan();
  const cycle = plan ? firstCycle(plan.id) : null;
  const trainable = plan ? firstTrainableCycle(plan.id) : null;
  const exercises = cycle ? listExercises(cycle.id) : [];
  const first = exercises[0] ?? null;
  const second = exercises[1] ?? null;
  const canTrain = Boolean(trainable && listExercises(trainable.id).length);

  return {
    html: `
      <section class="layout-split">
        <div>
          <article class="hero">
            <div class="kicker"><span class="dot"></span> Versão 011</div>
            <h2>Seu cronômetro de treino metabólico.</h2>
            <p>${
              plan
                ? `Plano ativo: <strong>${escapeHtml(plan.name)}</strong> · ${plan.days_count} ciclos · ${daysLabel(plan.days_count)}.`
                : "Crie um plano de 7, 15 ou 30 ciclos. Os dados ficam no SQLite deste aparelho."
            }</p>
            <div class="cta-row">
              <button class="btn btn-primary" ${canTrain ? `data-go="/treino/${trainable.id}"` : "disabled"}>
                Treinar hoje
              </button>
              <button class="btn btn-ghost" type="button" id="borrow-open" ${anyBorrowableCycle() ? "" : "disabled"}>
                ${icons.swap} Aproveitar outro dia
              </button>
              <button class="btn btn-ghost" data-go="${plan ? `/planos/${plan.id}` : "/planos/novo"}">
                ${plan ? "Abrir plano" : "Criar plano"}
              </button>
            </div>
          </article>

          <h3 class="section-title">Fases do ciclo</h3>
          <div class="grid cols-3">
            <article class="card phase-prep">
              <small>Preparação</small>
              <strong>${first ? escapeHtml(first.name) : "Nome do 1º exercício"}</strong>
              <p>${cycle ? `${formatClock(cycle.prep_seconds)} de aquecimento.` : "Contagem regressiva do aquecimento."}</p>
            </article>
            <article class="card phase-train">
              <small>Treino</small>
              <strong>${first ? escapeHtml(first.name) : "Exercício atual"}</strong>
              <p>${first ? `${formatClock(first.work_seconds)} neste movimento.` : "Tempo que você definir para cada movimento."}</p>
            </article>
            <article class="card phase-rest">
              <small>Intervalo</small>
              <strong>${second ? escapeHtml(second.name) : "Próximo exercício"}</strong>
              <p>${cycle ? `${formatClock(cycle.rest_seconds)} de descanso.` : "Descanso já mostrando o que vem a seguir."}</p>
            </article>
          </div>
        </div>

        <aside class="${plan ? "card plan-aside" : "empty"}">
          ${
            plan
              ? `
                <small>Hoje neste plano</small>
                <h3>${escapeHtml(cycle ? cycle.name : plan.name)}</h3>
                <p class="muted">${
                  first
                    ? `${exercises.length} exercício${exercises.length === 1 ? "" : "s"} · ${cycleRounds(cycle)}× · começa com ${escapeHtml(first.name)}.`
                    : "Abra o ciclo e adicione os exercícios."
                }</p>
              `
              : `
                <div class="empty-icon">${icons.dumbbell}</div>
                <h3>Nenhum plano ainda</h3>
                <p>Crie 7, 15 ou 30 ciclos e dê nomes como Segunda, Terça…</p>
              `
          }
        </aside>
      </section>
    `,
    bind(root) {
      root.querySelector("#borrow-open")?.addEventListener("click", () => {
        openBorrowModal({
          currentCycleId: trainable?.id,
          onPick: (cycle) => go(`/treino/${cycle.id}`),
        });
      });
    },
  };
}
