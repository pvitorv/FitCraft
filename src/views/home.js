import { nowParts, WEEKDAYS } from "../lib/calendar.js";
import { barChart, heatMap } from "../lib/charts.js";
import { escapeHtml } from "../lib/html.js";
import { icons } from "../lib/icons.js";
import { formatClock } from "../lib/time.js";
import { cycleForToday, cycleRounds } from "../models/Cycle.js";
import { listExercises } from "../models/Exercise.js";
import { getActivePlan } from "../models/Plan.js";
import { heatmapDays } from "../models/Session.js";
import { compressImage, getMotto, getProfilePhoto, setMotto, setProfilePhoto } from "../models/Profile.js";
import { go } from "../routes.js";
import { anyBorrowableCycle, openBorrowModal } from "./borrowModal.js";

let clockTimer = null;
let lastPhotoUrl = "";

export async function homeScreen() {
  const plan = getActivePlan();
  const now = nowParts();
  const cycle = plan ? cycleForToday(plan) : null;
  const exercises = cycle ? listExercises(cycle.id) : [];
  const first = exercises[0] ?? null;
  const second = exercises[1] ?? null;
  const canTrain = Boolean(cycle && exercises.length);
  const photo = await getProfilePhoto();
  if (lastPhotoUrl) URL.revokeObjectURL(lastPhotoUrl);
  const photoUrl = photo ? URL.createObjectURL(photo) : "";
  lastPhotoUrl = photoUrl;
  const motto = getMotto();
  const map = heatmapDays(35);

  return {
    html: `
      <section class="layout-split">
        <div>
          <article class="profile-card">
            <button type="button" class="avatar-btn" id="pick-photo" aria-label="Trocar foto de perfil">
              ${
                photoUrl
                  ? `<img src="${photoUrl}" alt="Sua foto" />`
                  : `<span class="avatar-fallback">${icons.camera}</span>`
              }
              <em>Trocar foto</em>
            </button>
            <div class="profile-copy">
              <p class="kicker"><span class="dot"></span> <span data-now-date>${escapeHtml(now.dateLabel)}</span> · <span data-now-clock>${escapeHtml(now.clock)}</span></p>
              <h2 data-now-hello>${escapeHtml(now.greeting)}, é ${escapeHtml(now.weekdayName.toLowerCase())}.</h2>
              <label class="motto-field">
                <span class="sr-only">Frase de efeito</span>
                <textarea id="motto" maxlength="120" rows="2">${escapeHtml(motto)}</textarea>
              </label>
            </div>
            <input id="photo-file" type="file" accept="image/*" hidden />
          </article>

          <article class="hero">
            <div class="kicker"><span class="dot"></span> Versão 019</div>
            <h2>${cycle ? `Hoje é ${escapeHtml(cycle.name)}.` : "Seu cronômetro de treino metabólico."}</h2>
            <p>${
              plan
                ? `Plano ativo: <strong>${escapeHtml(plan.name)}</strong> · o app abre o ciclo de ${escapeHtml(now.weekdayName.toLowerCase())}, ${escapeHtml(now.clock)}. Reaproveitar outro dia é escolha sua.`
                : "Crie um plano de 7, 15 ou 30 ciclos. Os dados ficam no SQLite deste aparelho."
            }</p>
            <div class="cta-row">
              <button class="btn btn-primary" ${canTrain ? `data-go="/treino/${cycle.id}"` : "disabled"}>
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

          <h3 class="section-title">Mapa de treino</h3>
          <article class="card progress-card">
            <div class="stat-grid is-inside">
              <div><small>Semana</small><strong>${map.weekCount}</strong></div>
              <div><small>Mês</small><strong>${map.monthCount}</strong></div>
              <div><small>Sequência</small><strong>${map.streak}d</strong></div>
              <div><small>Minutos na semana</small><strong>${map.weekMinutes}</strong></div>
            </div>
            ${heatMap(map.items)}
            ${barChart(map.weekdayCounts, ["#ffd400", "#ffd400", "#ff1a1a", "#ff1a1a", "#1f5cff", "#1f5cff", "#34d399"], WEEKDAYS.map((name) => name.slice(0, 3)))}
            <p class="muted">Cada quadrado é um dia. O gráfico conta os treinos concluídos desta semana.</p>
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
                <small>Ciclo original de hoje</small>
                <h3>${escapeHtml(cycle ? cycle.name : plan.name)}</h3>
                <p class="muted">${
                  first
                    ? `${exercises.length} exercício${exercises.length === 1 ? "" : "s"} · ${cycleRounds(cycle)}× · começa com ${escapeHtml(first.name)}.`
                    : "Este é o dia do calendário. Monte os exercícios aqui — aproveitar outro dia fica por sua conta."
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
      const clock = root.querySelector("[data-now-clock]");
      const dateEl = root.querySelector("[data-now-date]");
      const hello = root.querySelector("[data-now-hello]");
      const tick = () => {
        const next = nowParts();
        if (clock) clock.textContent = next.clock;
        if (dateEl) dateEl.textContent = next.dateLabel;
        if (hello) hello.textContent = `${next.greeting}, é ${next.weekdayName.toLowerCase()}.`;
      };
      window.clearInterval(clockTimer);
      clockTimer = window.setInterval(tick, 15000);

      root.querySelector("#motto")?.addEventListener("input", (event) => {
        setMotto(event.target.value);
      });
      root.querySelector("#motto")?.addEventListener("change", (event) => {
        event.target.value = setMotto(event.target.value);
      });

      const picker = root.querySelector("#photo-file");
      root.querySelector("#pick-photo")?.addEventListener("click", () => picker?.click());
      picker?.addEventListener("change", async () => {
        const file = picker.files?.[0];
        picker.value = "";
        if (!file) return;
        try {
          await setProfilePhoto(await compressImage(file));
          go("/");
        } catch (error) {
          alert(error.message);
        }
      });

      root.querySelector("#borrow-open")?.addEventListener("click", () => {
        openBorrowModal({
          currentCycleId: cycle?.id,
          onPick: (picked) => go(`/treino/${picked.id}`),
        });
      });
    },
  };
}
