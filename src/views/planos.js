import { daysLabel } from "../lib/cycleNames.js";
import { escapeHtml } from "../lib/html.js";
import { icons } from "../lib/icons.js";
import { activatePlan, createPlan, deletePlan, findPlan, listPlans, renamePlan } from "../models/Plan.js";
import { cycleRounds, listCycles } from "../models/Cycle.js";
import { go } from "../routes.js";

export async function planosScreen() {
  const plans = listPlans();

  return {
    html: `
      <article class="hero">
        <div class="kicker"><span class="dot"></span> Planos</div>
        <h2>7, 15 ou 30 ciclos.</h2>
        <p>Um ciclo por dia. Semanal, quinzenal ou mensal — tudo gravado no SQLite.</p>
        <div class="cta-row">
          <button class="btn btn-primary" data-go="/planos/novo">${icons.plus} Novo plano</button>
        </div>
      </article>
      ${
        plans.length
          ? `<div class="list" style="margin-top:16px">
              ${plans
                .map(
                  (plan) => `
                    <button class="row plan-row" data-go="/planos/${plan.id}">
                      <div>
                        <strong>${escapeHtml(plan.name)}</strong>
                        <p class="muted">${plan.days_count} ciclos · ${daysLabel(plan.days_count)}${plan.active ? " · ativo" : ""}</p>
                      </div>
                      ${plan.active ? `<span class="badge">Ativo</span>` : ""}
                    </button>
                  `,
                )
                .join("")}
            </div>`
          : `<div class="empty">
              <div class="empty-icon">${icons.plans}</div>
              <h3>Nenhum plano</h3>
              <p>Comece por um plano de 7 dias. Os ciclos já nascem como Segunda, Terça, Quarta…</p>
            </div>`
      }
    `,
  };
}

export async function planoNovoScreen() {
  return {
    html: `
      <button class="back-link" data-go="/planos">${icons.back} Planos</button>
      <article class="hero">
        <div class="kicker"><span class="dot"></span> Novo plano</div>
        <h2>Quantos dias você vai treinar?</h2>
        <p>O app cria um ciclo para cada dia. Depois você pode trocar os nomes.</p>
      </article>
      <form class="stack" id="plan-form">
        <label class="field">
          <span>Nome do plano</span>
          <input name="name" maxlength="40" placeholder="Metabólico da semana" value="Metabólico 7 dias" required />
        </label>
        <div class="choice-grid" role="radiogroup" aria-label="Quantidade de ciclos">
          <label class="choice selected">
            <input type="radio" name="days" value="7" checked />
            <strong>7</strong>
            <span>Semanal</span>
          </label>
          <label class="choice">
            <input type="radio" name="days" value="15" />
            <strong>15</strong>
            <span>Quinzenal</span>
          </label>
          <label class="choice">
            <input type="radio" name="days" value="30" />
            <strong>30</strong>
            <span>Mensal</span>
          </label>
        </div>
        <p class="form-error" id="plan-error" hidden></p>
        <button class="btn btn-primary" type="submit">Criar ciclos</button>
      </form>
    `,
    bind(root) {
      const form = root.querySelector("#plan-form");
      const error = root.querySelector("#plan-error");
      const nameInput = form.querySelector("[name=name]");

      root.querySelectorAll(".choice").forEach((label) => {
        label.addEventListener("click", () => {
          root.querySelectorAll(".choice").forEach((item) => item.classList.remove("selected"));
          label.classList.add("selected");
          const days = label.querySelector("input").value;
          if (!nameInput.dataset.touched) {
            nameInput.value = `Metabólico ${days} dias`;
          }
        });
      });

      nameInput.addEventListener("input", () => {
        nameInput.dataset.touched = "1";
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        try {
          const days = Number(new FormData(form).get("days"));
          const plan = createPlan(nameInput.value, days);
          go(`/planos/${plan.id}`);
        } catch (err) {
          error.hidden = false;
          error.textContent = err.message;
        }
      });
    },
  };
}

export async function planoScreen({ id }) {
  const plan = findPlan(id);
  if (!plan) {
    return {
      html: `
        <div class="empty">
          <h3>Plano não encontrado</h3>
          <p>Ele pode ter sido apagado.</p>
          <button class="btn btn-ghost" data-go="/planos">Voltar aos planos</button>
        </div>
      `,
    };
  }

  const cycles = listCycles(plan.id);

  return {
    html: `
      <button class="back-link" data-go="/planos">${icons.back} Planos</button>
      <article class="hero">
        <div class="kicker"><span class="dot"></span> ${daysLabel(plan.days_count)} · ${plan.days_count} ciclos</div>
        <label class="plan-title-field">
          <span class="sr-only">Nome do plano</span>
          <input id="plan-name" maxlength="40" value="${escapeHtml(plan.name)}" />
        </label>
        <p>Abra um dia para montar os exercícios e os tempos de preparação, treino e intervalo.</p>
        <div class="cta-row">
          ${
            plan.active
              ? `<span class="badge">Plano ativo</span>`
              : `<button class="btn btn-primary" type="button" id="activate-plan">Usar este plano</button>`
          }
          <button class="btn btn-danger" type="button" id="delete-plan">${icons.trash} Apagar</button>
        </div>
      </article>
      <ol class="cycle-list">
        ${cycles
          .map(
            (cycle) => `
              <li>
                <button class="cycle-item cycle-link" data-go="/planos/${plan.id}/ciclos/${cycle.id}">
                  <span class="cycle-index">${String(cycle.day_index + 1).padStart(2, "0")}</span>
                  <div class="cycle-copy">
                    <strong>${escapeHtml(cycle.name)}</strong>
                    <p class="muted">${cycle.exercise_count} exercício${cycle.exercise_count === 1 ? "" : "s"} · ${cycleRounds(cycle)}× · prep ${cycle.prep_seconds}s · intervalo ${cycle.rest_seconds}s</p>
                  </div>
                  ${icons.chevron}
                </button>
              </li>
            `,
          )
          .join("")}
      </ol>
    `,
    bind(root) {
      const planName = root.querySelector("#plan-name");
      planName.addEventListener("change", () => {
        try {
          renamePlan(plan.id, planName.value);
        } catch (err) {
          planName.value = plan.name;
          alert(err.message);
        }
      });

      root.querySelector("#activate-plan")?.addEventListener("click", () => {
        activatePlan(plan.id);
        go(`/planos/${plan.id}`);
      });

      root.querySelector("#delete-plan")?.addEventListener("click", () => {
        const ok = window.confirm(`Apagar “${plan.name}” e os ${plan.days_count} ciclos?`);
        if (!ok) return;
        deletePlan(plan.id);
        go("/planos");
      });
    },
  };
}
