import { all, get, lastId, run } from "../database/connection.js";
import { isoDate, startOfMonth } from "../lib/calendar.js";
import { parseReais } from "../lib/money.js";

export const EXPENSE_CATEGORIES = [
  { id: "academia", label: "Academia e aulas", color: "#ffd400" },
  { id: "alimentacao", label: "Alimentação", color: "#34d399" },
  { id: "suplemento", label: "Suplementos", color: "#0057ff" },
  { id: "consulta", label: "Consulta e profissional", color: "#c084fc" },
  { id: "equipamento", label: "Equipamento", color: "#fb923c" },
  { id: "farmacia", label: "Farmácia e bem-estar", color: "#ff1a1a" },
  { id: "transporte", label: "Deslocamento do treino", color: "#67e8f9" },
  { id: "outro", label: "Outro bem-estar", color: "#a8a29e" },
];

export function categoryMeta(id) {
  return EXPENSE_CATEGORIES.find((item) => item.id === id) ?? EXPENSE_CATEGORIES.at(-1);
}

export function addExpense({ spentOn, category, amountReais, note = "" }) {
  const cents = Math.round(parseReais(amountReais) * 100);
  if (!Number.isFinite(cents) || cents <= 0) {
    throw new Error("Informe um valor maior que zero.");
  }
  const chosen = categoryMeta(category).id;
  const day = spentOn || isoDate();
  run(
    `
      INSERT INTO expenses (spent_on, category, amount_cents, note, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    [day, chosen, cents, String(note).trim().slice(0, 120), new Date().toISOString()],
  );
  return findExpense(lastId());
}

export function findExpense(id) {
  return get("SELECT * FROM expenses WHERE id = ?", [id]);
}

export function deleteExpense(id) {
  run("DELETE FROM expenses WHERE id = ?", [id]);
}

export function listExpensesInMonth(date = new Date()) {
  const start = startOfMonth(date);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return all(
    `
      SELECT * FROM expenses
      WHERE spent_on >= ? AND spent_on < ?
      ORDER BY spent_on DESC, id DESC
    `,
    [isoDate(start), isoDate(end)],
  );
}

export function monthTotals(date = new Date()) {
  const rows = listExpensesInMonth(date);
  const byCategory = EXPENSE_CATEGORIES.map((item) => ({
    ...item,
    cents: rows.filter((row) => row.category === item.id).reduce((sum, row) => sum + row.amount_cents, 0),
  }));
  return {
    rows,
    byCategory,
    totalCents: rows.reduce((sum, row) => sum + row.amount_cents, 0),
    foodCents: rows
      .filter((row) => row.category === "alimentacao" || row.category === "suplemento")
      .reduce((sum, row) => sum + row.amount_cents, 0),
    trainingCents: rows
      .filter((row) => ["academia", "equipamento", "transporte"].includes(row.category))
      .reduce((sum, row) => sum + row.amount_cents, 0),
  };
}
