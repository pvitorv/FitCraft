import { WEEKDAYS, addDays, isoDate, monthLabel, parseIsoDate, startOfWeek } from "../lib/calendar.js";
import { escapeHtml } from "../lib/html.js";
import { icons } from "../lib/icons.js";
import { MEAL_SLOTS, copyWeek, monthPlan, upsertMeal, weekPlan } from "../models/Nutrition.js";
import { persistNow } from "../database/connection.js";
import { go } from "../routes.js";

export async function nutricaoScreen(params = {}) {
  const scope = params.scope === "mes" ? "mes" : "semana";
  const anchor = params.day ? parseIsoDate(params.day) : new Date();
  const days = scope === "mes" ? monthPlan(anchor) : weekPlan(anchor);
  const selected = params.day || isoDate(anchor);
  const current = days.find((day) => day.date === selected) ?? days[0];
  const weekStart = startOfWeek(anchor);
  const prev = scope === "mes"
    ? new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1)
    : addDays(weekStart, -7);
  const next = scope === "mes"
    ? new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)
    : addDays(weekStart, 7);

  return {
    html: `
      <article class="hero">
        <div class="kicker"><span class="dot"></span> Nutrição</div>
        <h2>Comida no mesmo calendário do treino.</h2>
        <p>Monte a semana ou o mês. Cada dia mostra o ciclo planejado para você conjugar prato e timer.</p>
        <div class="cta-row">
          <button class="btn ${scope === "semana" ? "btn-primary" : "btn-ghost"}" data-go="/nutricao/semana/${isoDate(anchor)}">Semana</button>
          <button class="btn ${scope === "mes" ? "btn-primary" : "btn-ghost"}" data-go="/nutricao/mes/${isoDate(anchor)}">Mês</button>
          <button class="btn btn-ghost" type="button" id="copy-week">Copiar semana passada</button>
        </div>
        <div class="cta-row">
          <button class="btn btn-ghost" data-go="/nutricao/${scope}/${isoDate(prev)}">←</button>
          <strong class="month-chip">${scope === "mes" ? escapeHtml(monthLabel(anchor)) : "Semana de " + isoDate(weekStart).split("-").reverse().join("/")}</strong>
          <button class="btn btn-ghost" data-go="/nutricao/${scope}/${isoDate(next)}">→</button>
        </div>
      </article>

      <div class="day-strip">
        ${days
          .map((day) => `
            <button type="button" class="day-chip ${day.date === current.date ? "is-selected" : ""} ${day.date === isoDate() ? "is-today" : ""}" data-go="/nutricao/${scope}/${day.date}">
              <small>${WEEKDAYS[day.weekdayIndex].slice(0, 3)}</small>
              <strong>${day.dateObj.getDate()}</strong>
              <em>${day.filled}/6</em>
            </button>
          `)
          .join("")}
      </div>

      <article class="card plan-aside">
        <small>Treino deste dia</small>
        <h3>${escapeHtml(current.cycle?.name ?? "Sem plano ativo")}</h3>
        <p class="muted">${
          current.cycle
            ? "Use o mesmo dia do calendário: se hoje é sábado, o treino de sábado e a comida de sábado andam juntos."
            : "Crie um plano de treino para ver o ciclo ao lado das refeições."
        }</p>
      </article>

      <div class="meal-list">
        ${MEAL_SLOTS.map((slot) => {
          const meal = current.meals[slot.id];
          return `
            <article class="card meal-card">
              <small>${escapeHtml(slot.label)}</small>
              <label class="field">
                <span>O que vai comer</span>
                <input
                  class="meal-title"
                  data-date="${current.date}"
                  data-slot="${slot.id}"
                  maxlength="80"
                  placeholder="Ex.: ovos, aveia e fruta"
                  value="${escapeHtml(meal?.title || "")}"
                />
              </label>
              <label class="field">
                <span>Observação</span>
                <input
                  class="meal-notes"
                  data-date="${current.date}"
                  data-slot="${slot.id}"
                  maxlength="160"
                  placeholder="Horário, quantidade, troca…"
                  value="${escapeHtml(meal?.notes || "")}"
                />
              </label>
            </article>
          `;
        }).join("")}
      </div>
    `,
    bind(root) {
      const save = (field) => {
        upsertMeal(field.dataset.date, field.dataset.slot, {
          title: root.querySelector(`.meal-title[data-slot="${field.dataset.slot}"]`)?.value,
          notes: root.querySelector(`.meal-notes[data-slot="${field.dataset.slot}"]`)?.value,
        });
      };
      root.querySelectorAll(".meal-title, .meal-notes").forEach((field) => {
        field.addEventListener("input", () => save(field));
        field.addEventListener("change", () => save(field));
      });
      root.querySelector("#copy-week")?.addEventListener("click", async () => {
        copyWeek(addDays(weekStart, -7), weekStart);
        await persistNow();
        go(`/nutricao/semana/${isoDate(weekStart)}`);
      });
    },
  };
}
