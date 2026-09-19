import { persistNow } from "../database/connection.js";
import { barChart } from "../lib/charts.js";
import { isoDate, parseIsoDate } from "../lib/calendar.js";
import { escapeHtml } from "../lib/html.js";
import { icons } from "../lib/icons.js";
import {
  BODY_FIELDS,
  addBodyLog,
  bodyProgress,
  deleteBodyLog,
  formatMeasure,
} from "../models/Body.js";
import { go } from "../routes.js";

function prettyDate(value) {
  return String(value || "").split("-").reverse().join("/");
}

function measureLine(row, key, unit) {
  if (row?.[key] == null) return "—";
  return `${formatMeasure(row[key])} ${unit}`;
}

export async function medidasScreen() {
  const { logs, first, latest, deltas } = bodyProgress();
  const today = isoDate();
  const weights = logs.filter((row) => row.weight_kg != null).slice(-12);
  const firstWeight = first?.weight_kg != null ? measureLine(first, "weight_kg", "kg") : "—";
  const latestWeight = latest?.weight_kg != null ? measureLine(latest, "weight_kg", "kg") : "—";

  return {
    html: `
      <article class="hero">
        <div class="kicker"><span class="dot"></span> Medidas</div>
        <h2>Acompanhe o seu corpo.</h2>
        <p>Anote o ponto de partida e volte quando quiser. O comparativo fica neste aparelho, junto com o treino.</p>
      </article>

      <div class="stat-grid">
        <article class="card">
          <small>Primeira</small>
          <strong>${escapeHtml(firstWeight)}</strong>
          <p class="muted">${first ? prettyDate(first.taken_on) : "Ainda não anotou"}</p>
        </article>
        <article class="card">
          <small>Agora</small>
          <strong>${escapeHtml(latestWeight)}</strong>
          <p class="muted">${latest ? prettyDate(latest.taken_on) : "Faça a primeira medida"}</p>
        </article>
        <article class="card">
          <small>Registros</small>
          <strong>${logs.length}</strong>
          <p class="muted">${logs.length === 1 ? "medida" : "medidas"} no histórico</p>
        </article>
      </div>

      ${
        deltas.length
          ? `<div class="delta-row">
              ${deltas
                .map(
                  (item) =>
                    `<span class="delta-chip ${item.down ? "is-down" : "is-up"}">${escapeHtml(item.label)} ${escapeHtml(item.text)}</span>`,
                )
                .join("")}
            </div>`
          : `<p class="muted">A primeira anotação vira o ponto de partida. As próximas mostram o que mudou.</p>`
      }

      ${
        weights.length >= 2
          ? `<article class="card progress-card">
              <small>Peso ao longo do tempo</small>
              ${barChart(
                weights.map((row) => row.weight_kg),
                ["#0057ff"],
                weights.map((row) => String(parseIsoDate(row.taken_on).getDate()).padStart(2, "0")),
              )}
            </article>`
          : ""
      }

      <form class="card expense-form" id="body-form">
        <strong>Nova medida</strong>
        <label class="field">
          <span>Data</span>
          <input name="takenOn" type="date" value="${today}" required />
        </label>
        <div class="measure-grid">
          ${BODY_FIELDS.map(
            (field) => `
              <label class="field">
                <span>${escapeHtml(field.label)}</span>
                <input name="${field.id}" inputmode="decimal" placeholder="${escapeHtml(field.placeholder)}" />
              </label>
            `,
          ).join("")}
          <label class="field is-wide">
            <span>Nota</span>
            <input name="note" maxlength="120" placeholder="Como você está se sentindo" />
          </label>
        </div>
        <p class="form-error" id="body-error" hidden></p>
        <button class="btn btn-primary" type="submit">${icons.plus} Guardar medidas</button>
      </form>

      <h3 class="section-title">Histórico</h3>
      ${
        logs.length
          ? `<div class="list">
              ${[...logs]
                .reverse()
                .map((row) => {
                  const bits = [
                    row.weight_kg != null ? `${formatMeasure(row.weight_kg)} kg` : null,
                    row.waist_cm != null ? `cintura ${formatMeasure(row.waist_cm)} cm` : null,
                    row.chest_cm != null ? `peito ${formatMeasure(row.chest_cm)} cm` : null,
                    row.arm_cm != null ? `braço ${formatMeasure(row.arm_cm)} cm` : null,
                    row.fat_percent != null ? `${formatMeasure(row.fat_percent)}% gordura` : null,
                  ].filter(Boolean);
                  return `
                    <article class="row">
                      <div>
                        <strong>${prettyDate(row.taken_on)}</strong>
                        <p class="muted">${escapeHtml(bits.join(" · ") || "Medidas anotadas")}${
                          row.note ? ` · ${escapeHtml(row.note)}` : ""
                        }</p>
                      </div>
                      <button type="button" class="icon-btn" data-del-body="${row.id}" aria-label="Apagar">${icons.trash}</button>
                    </article>
                  `;
                })
                .join("")}
            </div>`
          : `<div class="empty"><h3>Nenhuma medida ainda</h3><p>Comece pelo peso, cintura ou o que você quiser acompanhar.</p></div>`
      }
    `,
    bind(root) {
      const form = root.querySelector("#body-form");
      const error = root.querySelector("#body-error");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        try {
          addBodyLog({
            takenOn: data.get("takenOn"),
            weight_kg: data.get("weight_kg"),
            height_cm: data.get("height_cm"),
            chest_cm: data.get("chest_cm"),
            waist_cm: data.get("waist_cm"),
            hip_cm: data.get("hip_cm"),
            arm_cm: data.get("arm_cm"),
            thigh_cm: data.get("thigh_cm"),
            neck_cm: data.get("neck_cm"),
            fat_percent: data.get("fat_percent"),
            note: data.get("note"),
          });
          await persistNow();
          go("/medidas");
        } catch (err) {
          error.hidden = false;
          error.textContent = err.message;
        }
      });
      root.querySelectorAll("[data-del-body]").forEach((button) => {
        button.addEventListener("click", async () => {
          deleteBodyLog(Number(button.dataset.delBody));
          await persistNow();
          go("/medidas");
        });
      });
    },
  };
}
