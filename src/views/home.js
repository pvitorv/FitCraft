import { daysLabel } from "../lib/cycleNames.js";
import { escapeHtml } from "../lib/html.js";
import { icons } from "../lib/icons.js";
import { firstCycle } from "../models/Cycle.js";
import { getActivePlan } from "../models/Plan.js";

export async function homeScreen() {
  const plan = getActivePlan();
  const cycle = plan ? firstCycle(plan.id) : null;

  return {
    html: `
      <section class="layout-split">
        <div>
          <article class="hero">
            <div class="kicker"><span class="dot"></span> Versão 003</div>
            <h2>Seu cronômetro de treino metabólico.</h2>
            <p>${
              plan
                ? `Plano ativo: <strong>${escapeHtml(plan.name)}</strong> · ${plan.days_count} ciclos · ${daysLabel(plan.days_count)}.`
                : "Crie um plano de 7, 15 ou 30 ciclos. Os dados ficam no SQLite deste aparelho."
            }</p>
            <div class="cta-row">
              <button class="btn btn-primary" disabled>Treinar hoje</button>
              <button class="btn btn-ghost" data-go="${plan ? `/planos/${plan.id}` : "/planos/novo"}">
                ${plan ? "Abrir plano" : "Criar plano"}
              </button>
            </div>
          </article>

          <h3 class="section-title">Fases do ciclo</h3>
          <div class="grid cols-3">
            <article class="card phase-prep">
              <small>Preparação</small>
              <strong>${cycle ? escapeHtml(cycle.name) : "Nome do 1º exercício"}</strong>
              <p>Contagem regressiva do aquecimento.</p>
            </article>
            <article class="card phase-train">
              <small>Treino</small>
              <strong>${cycle ? escapeHtml(cycle.name) : "Exercício atual"}</strong>
              <p>Tempo que você definir para cada movimento.</p>
            </article>
            <article class="card phase-rest">
              <small>Intervalo</small>
              <strong>Próximo exercício</strong>
              <p>Descanso já mostrando o que vem a seguir.</p>
            </article>
          </div>
        </div>

        <aside class="${plan ? "card plan-aside" : "empty"}">
          ${
            plan
              ? `
                <small>Hoje neste plano</small>
                <h3>${escapeHtml(cycle ? cycle.name : plan.name)}</h3>
                <p class="muted">${escapeHtml(plan.name)} · ${plan.days_count} dias. Exercícios entram na 004.</p>
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
  };
}
