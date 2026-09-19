import { persistNow } from "../database/connection.js";
import { applyCyclePack, isAbortError, pickCycleFile, readCyclePackFromFile } from "../lib/cyclePack.js";
import { escapeHtml } from "../lib/html.js";
import { icons } from "../lib/icons.js";
import { cycleRounds, findCycle, listCycles } from "../models/Cycle.js";
import { getActivePlan, listPlans } from "../models/Plan.js";
import { go } from "../routes.js";

let overlay = null;
let onKey = null;
let onHash = null;

export function closeImportCycleModal() {
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

function packSummary(pack) {
  const count = pack.cycle.exercises.length;
  return `${count} exercício${count === 1 ? "" : "s"} · ${pack.cycle.rounds}× · prep ${pack.cycle.prepSeconds}s · intervalo ${pack.cycle.restSeconds}s`;
}

export function openImportCycleModal({ pack, preferredCycleId = null, onApplied } = {}) {
  closeImportCycleModal();

  const plans = listPlans();
  if (!plans.length) {
    alert("Crie um plano antes de receber um ciclo.");
    return;
  }

  const active = getActivePlan();
  let planId = active?.id ?? plans[0].id;
  if (preferredCycleId) {
    const owner = plans.find((plan) => listCycles(plan.id).some((cycle) => cycle.id === preferredCycleId));
    if (owner) planId = owner.id;
  }

  const pickDefaultDay = (id) => {
    const cycles = listCycles(id);
    if (preferredCycleId && cycles.some((cycle) => cycle.id === preferredCycleId)) {
      return preferredCycleId;
    }
    return cycles.find((cycle) => cycle.exercise_count === 0)?.id ?? cycles[0]?.id ?? null;
  };

  let cycleId = pickDefaultDay(planId);

  overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <header class="modal-head">
        <div>
          <p class="kicker"><span class="dot"></span> Arquivo .fitcraft</p>
          <h2 id="import-title">${escapeHtml(pack.cycle.name)}</h2>
          <p>${escapeHtml(packSummary(pack))}. O nome do dia no seu calendário continua o mesmo.</p>
        </div>
        <button type="button" class="icon-btn" data-close aria-label="Fechar">${icons.close}</button>
      </header>
      <div class="borrow-plans" role="tablist" aria-label="Planos"></div>
      <div class="borrow-days" role="listbox" aria-label="Dia que vai receber o ciclo"></div>
      <footer class="modal-foot">
        <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
        <button type="button" class="btn btn-primary" data-confirm>Colocar neste dia</button>
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
            <span>${ready} dia${ready === 1 ? "" : "s"} com treino${plan.active ? " · ativo" : ""}</span>
          </button>
        `;
      })
      .join("");

    const cycles = listCycles(planId);
    daysEl.innerHTML = cycles.length
      ? cycles
          .map((cycle) => {
            const ready = cycle.exercise_count > 0;
            return `
              <button
                type="button"
                class="borrow-day ${cycle.id === cycleId ? "is-selected" : ""}"
                data-cycle="${cycle.id}"
                role="option"
                aria-selected="${cycle.id === cycleId}"
              >
                <span class="cycle-index">${String(cycle.day_index + 1).padStart(2, "0")}</span>
                <span class="borrow-day-copy">
                  <strong>${escapeHtml(cycle.name)}</strong>
                  <em>${
                    ready
                      ? `${cycle.exercise_count} exercício${cycle.exercise_count === 1 ? "" : "s"} · ${cycleRounds(cycle)}× · será substituído`
                      : "Vazio — bom lugar para receber"
                  }</em>
                </span>
              </button>
            `;
          })
          .join("")
      : `<p class="muted">Este plano ainda não tem ciclos.</p>`;

    const chosen = cycles.find((cycle) => cycle.id === cycleId);
    confirm.disabled = !chosen;
    confirm.textContent = chosen ? `Colocar em ${chosen.name}` : "Escolha um dia";
  };

  let done = false;
  const apply = async () => {
    if (done) return;
    const chosen = findCycle(cycleId);
    if (!chosen) return;
    if (chosen.exercise_count > 0) {
      const ok = window.confirm(
        `Substituir os ${chosen.exercise_count} exercício${chosen.exercise_count === 1 ? "" : "s"} de “${chosen.name}”?`,
      );
      if (!ok) return;
    }
    done = true;
    applyCyclePack(chosen.id, pack, { keepName: true });
    await persistNow();
    closeImportCycleModal();
    onApplied?.(findCycle(chosen.id));
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target.closest("[data-close]")) {
      closeImportCycleModal();
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
    if (!button) return;
    cycleId = Number(button.dataset.cycle);
    paint();
  });

  confirm.addEventListener("click", () => {
    apply().catch((error) => {
      done = false;
      alert(error.message);
    });
  });
  sheet.addEventListener("click", (event) => event.stopPropagation());

  onKey = (event) => {
    if (event.key === "Escape") closeImportCycleModal();
    if (event.key === "Enter" && !confirm.disabled) {
      apply().catch((error) => {
        done = false;
        alert(error.message);
      });
    }
  };
  onHash = () => closeImportCycleModal();
  window.addEventListener("keydown", onKey);
  window.addEventListener("hashchange", onHash);

  document.body.appendChild(overlay);
  paint();
  overlay.querySelector("[data-close]")?.focus();
}

export async function importCycleFromFile({ preferredCycleId = null, onApplied } = {}) {
  try {
    const file = await pickCycleFile();
    const pack = await readCyclePackFromFile(file);
    if (preferredCycleId && listPlans().length) {
      const target = findCycle(preferredCycleId);
      if (target) {
        if (target.exercise_count > 0) {
          const ok = window.confirm(
            `Colocar “${pack.cycle.name}” em “${target.name}”? Os exercícios atuais deste dia serão substituídos.`,
          );
          if (!ok) return;
        }
        applyCyclePack(target.id, pack, { keepName: true });
        await persistNow();
        onApplied?.(findCycle(target.id));
        return;
      }
    }
    openImportCycleModal({
      pack,
      preferredCycleId,
      onApplied: onApplied ?? ((cycle) => go(`/planos/${cycle.plan_id}/ciclos/${cycle.id}`)),
    });
  } catch (error) {
    if (isAbortError(error)) return;
    alert(error.message);
  }
}
