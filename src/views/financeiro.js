import { WEEKDAYS, isoDate, monthLabel, parseIsoDate } from "../lib/calendar.js";
import { barChart, stackBars } from "../lib/charts.js";
import { escapeHtml } from "../lib/html.js";
import { icons } from "../lib/icons.js";
import { formatBRL } from "../lib/money.js";
import {
  EXPENSE_CATEGORIES,
  addExpense,
  categoryMeta,
  deleteExpense,
  monthTotals,
} from "../models/Expense.js";
import { persistNow } from "../database/connection.js";
import { go } from "../routes.js";

function monthFromParams(params) {
  if (params.month) return parseIsoDate(`${params.month}-01`);
  return new Date();
}

export async function financeiroScreen(params = {}) {
  const month = monthFromParams(params);
  const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const totals = monthTotals(month);
  const today = isoDate();

  return {
    html: `
      <article class="hero">
        <div class="kicker"><span class="dot"></span> Financeiro</div>
        <h2>Gastos de bem-estar.</h2>
        <p>Academia, comida, suplemento, consulta, equipamento — tudo desta vida entra aqui. Sem banco, sem nuvem.</p>
        <div class="cta-row">
          <button class="btn btn-ghost" data-go="/financeiro/${isoDate(prev).slice(0, 7)}">←</button>
          <strong class="month-chip">${escapeHtml(monthLabel(month))}</strong>
          <button class="btn btn-ghost" data-go="/financeiro/${isoDate(next).slice(0, 7)}">→</button>
        </div>
      </article>

      <div class="stat-grid">
        <article class="card">
          <small>Este mês</small>
          <strong>${formatBRL(totals.totalCents)}</strong>
        </article>
        <article class="card">
          <small>Nutrição</small>
          <strong>${formatBRL(totals.foodCents)}</strong>
        </article>
        <article class="card">
          <small>Treino</small>
          <strong>${formatBRL(totals.trainingCents)}</strong>
        </article>
      </div>
      ${stackBars(totals.byCategory)}
      ${barChart(
        totals.byCategory.map((item) => item.cents / 100),
        totals.byCategory.map((item) => item.color),
        totals.byCategory.map((item) => item.label.slice(0, 3)),
      )}

      <form class="card expense-form" id="expense-form">
        <strong>Novo gasto</strong>
        <label class="field">
          <span>Data</span>
          <input name="spentOn" type="date" value="${today}" required />
        </label>
        <label class="field">
          <span>Categoria</span>
          <select name="category">
            ${EXPENSE_CATEGORIES.map((item) => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          <span>Valor (R$)</span>
          <input name="amount" inputmode="decimal" placeholder="0,00" required />
        </label>
        <label class="field">
          <span>Nota</span>
          <input name="note" maxlength="120" placeholder="Whey, mensalidade, hortifruti…" />
        </label>
        <p class="form-error" id="expense-error" hidden></p>
        <button class="btn btn-primary" type="submit">${icons.plus} Registrar</button>
      </form>

      <h3 class="section-title">Lançamentos</h3>
      ${
        totals.rows.length
          ? `<div class="list">
              ${totals.rows
                .map((row) => {
                  const meta = categoryMeta(row.category);
                  return `
                    <article class="row">
                      <div>
                        <strong>${escapeHtml(meta.label)}</strong>
                        <p class="muted">${row.spent_on.split("-").reverse().join("/")}${row.note ? ` · ${escapeHtml(row.note)}` : ""}</p>
                      </div>
                      <div class="expense-side">
                        <strong>${formatBRL(row.amount_cents)}</strong>
                        <button type="button" class="icon-btn" data-del-expense="${row.id}" aria-label="Apagar">${icons.trash}</button>
                      </div>
                    </article>
                  `;
                })
                .join("")}
            </div>`
          : `<div class="empty"><h3>Nenhum gasto neste mês</h3><p>Registre o que entrar em nutrição e bem-estar.</p></div>`
      }
    `,
    bind(root) {
      const form = root.querySelector("#expense-form");
      const error = root.querySelector("#expense-error");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        try {
          addExpense({
            spentOn: data.get("spentOn"),
            category: data.get("category"),
            amountReais: data.get("amount"),
            note: data.get("note"),
          });
          await persistNow();
          go(`/financeiro/${isoDate(month).slice(0, 7)}`);
        } catch (err) {
          error.hidden = false;
          error.textContent = err.message;
        }
      });
      root.querySelectorAll("[data-del-expense]").forEach((button) => {
        button.addEventListener("click", async () => {
          deleteExpense(Number(button.dataset.delExpense));
          await persistNow();
          go(`/financeiro/${isoDate(month).slice(0, 7)}`);
        });
      });
    },
  };
}
