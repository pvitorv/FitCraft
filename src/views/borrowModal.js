import { escapeHtml } from "../lib/html.js";
import { icons } from "../lib/icons.js";
import { cycleRounds, listCycles } from "../models/Cycle.js";
import { getActivePlan, listPlans } from "../models/Plan.js";

let overlay = null;
let onKey = null;
let onHash = null;

export function anyBorrowableCycle() {
  return listPlans().some((plan) => listCycles(plan.id).some((cycle) => cycle.exercise_count > 0));
}

export function closeBorrowModal() {
  overlay?.remove();
  overlay = null;
  if (onKey) {
    window.removeEventListener("keydown", onKey);
    onKey = null;
  }
  if (onHash) {
    window.removeEventListener("hashchange", onHash);
    onHash = null;
  }
}

export function openBorrowModal({ currentCycleId = null, onPick } = {}) {
  closeBorrowModal();

  const plans = listPlans();
  const active = getActivePlan();
  if (!plans.length) return;

  let planId = active?.id ?? plans[0].id;
  if (currentCycleId) {
    const owner = plans.find((plan) => listCycles(plan.id).some((cycle) => cycle.id === currentCycleId));
    if (owner) planId = owner.id;
  }

  const pickDefaultDay = (id) => {
    const cycles = listCycles(id);
    if (currentCycleId && cycles.some((cycle) => cycle.id === currentCycleId)) {
      return currentCycleId;
    }
    return cycles.find((cycle) => cycle.exercise_count > 0)?.id ?? null;
  };

  let cycleId = pickDefaultDay(planId);

  overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="borrow-title">
      <header class="modal-head">
        <div>
          <p class="kicker"><span class="dot"></span> Fora do roteiro</p>
          <h2 id="borrow-title">Aproveitar outro treino</h2>
          <p>Escolha o plano e o dia. O plano ativo continua o mesmo.</p>
        </div>
        <button type="button" class="icon-btn" data-close aria-label="Fechar">${icons.close}</button>
      </header>
      <div class="borrow-plans" role="tablist" aria-label="Planos"></div>
      <div class="borrow-days" role="listbox" aria-label="Dias do plano"></div>
      <footer class="modal-foot">
        <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
        <button type="button" class="btn btn-primary" data-confirm>Treinar este dia</button>
      </footer>
    </div>
  `;

  const sheet = overlay.querySelector(".modal-sheet");
  const plansEl = overlay.querySelector(".borrow-plans");
  const daysEl = overlay.querySelector(".borrow-days");
  const confirm = overlay.querySelector("[data-confirm]");

  const paint = () => {
    plansEl.innerHTML = plans
      .map((plan) => {
        const ready = listCycles(plan.id).filter((cycle) => cycle.exercise_count > 0).length;
        return `
          <button
            type="button"
            class="borrow-chip ${plan.id === planId ? "is-selected" : ""}"
            data-plan="${plan.id}"
            role="tab"
            aria-selected="${plan.id === planId}"
          >
            <strong>${escapeHtml(plan.name)}</strong>
            <span>${ready} dia${ready === 1 ? "" : "s"} pronto${ready === 1 ? "" : "s"}${plan.active ? " · ativo" : ""}</span>
          </button>
        `;
      })
      .join("");

    const cycles = listCycles(planId);
    daysEl.innerHTML = cycles.length
      ? cycles
          .map((cycle) => {
            const ready = cycle.exercise_count > 0;
            const current = cycle.id === currentCycleId;
            return `
              <button
                type="button"
                class="borrow-day ${cycle.id === cycleId ? "is-selected" : ""} ${ready ? "" : "is-empty"}"
                data-cycle="${cycle.id}"
                ${ready ? "" : "disabled"}
                role="option"
                aria-selected="${cycle.id === cycleId}"
              >
                <span class="cycle-index">${String(cycle.day_index + 1).padStart(2, "0")}</span>
                <span class="borrow-day-copy">
                  <strong>${escapeHtml(cycle.name)}</strong>
                  <em>${
                    ready
                      ? `${cycle.exercise_count} exercício${cycle.exercise_count === 1 ? "" : "s"} · ${cycleRounds(cycle)}×${current ? " · em uso" : ""}`
                      : "Sem exercícios ainda"
                  }</em>
                </span>
              </button>
            `;
          })
          .join("")
      : `<p class="muted">Este plano ainda não tem ciclos.</p>`;

    const chosen = cycles.find((cycle) => cycle.id === cycleId && cycle.exercise_count > 0);
    confirm.disabled = !chosen;
    confirm.textContent = chosen ? `Treinar ${chosen.name}` : "Escolha um dia com exercícios";
  };

  let done = false;
  const pick = () => {
    if (done) return;
    const chosen = listCycles(planId).find((cycle) => cycle.id === cycleId && cycle.exercise_count > 0);
    if (!chosen) return;
    done = true;
    closeBorrowModal();
    onPick?.(chosen);
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target.closest("[data-close]")) {
      closeBorrowModal();
    }
  });

  plansEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-plan]");
    if (!button) return;
    planId = Number(button.dataset.plan);
    cycleId = pickDefaultDay(planId);
    paint();
  });

  daysEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cycle]");
    if (!button || button.disabled) return;
    cycleId = Number(button.dataset.cycle);
    paint();
  });

  confirm.addEventListener("click", pick);
  sheet.addEventListener("click", (event) => event.stopPropagation());

  onKey = (event) => {
    if (event.key === "Escape") closeBorrowModal();
    if (event.key === "Enter" && !confirm.disabled) pick();
  };
  onHash = () => closeBorrowModal();
  window.addEventListener("keydown", onKey);
  window.addEventListener("hashchange", onHash);

  document.body.appendChild(overlay);
  paint();
  overlay.querySelector("[data-close]")?.focus();
}
