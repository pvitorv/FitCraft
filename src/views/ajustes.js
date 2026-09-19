import { getSetting, setSetting } from "../models/Setting.js";
import { icons } from "../lib/icons.js";
import { importCycleFromFile } from "./importCycleModal.js";

function switchClass(on) {
  return on ? "switch is-on" : "switch";
}

export async function ajustesScreen() {
  const keepOn = getSetting("keep_screen_on", "1") === "1";
  const beepOn = getSetting("beep_enabled", "1") === "1";

  return {
    html: `
      <article class="hero">
        <div class="kicker"><span class="dot"></span> Ajustes</div>
        <h2>Tudo no aparelho.</h2>
        <p>Som, vibração e tela ligada valem só para o timer. A playlist liga e pausa sozinha.</p>
      </article>
      <div class="list" style="margin-top:16px">
        <button class="row" type="button" data-toggle="keep_screen_on">
          <div>
            <strong>Manter tela ligada</strong>
            <p class="muted">Durante o treino, se o aparelho permitir.</p>
          </div>
          <div class="${switchClass(keepOn)}" aria-hidden="true"></div>
        </button>
        <button class="row" type="button" data-toggle="beep_enabled">
          <div>
            <strong>Som e vibração</strong>
            <p class="muted">Beep nos últimos 3 segundos de cada fase.</p>
          </div>
          <div class="${switchClass(beepOn)}" aria-hidden="true"></div>
        </button>
        <button class="row" type="button" id="import-cycle">
          <div>
            <strong>Receber um ciclo</strong>
            <p class="muted">Abre o arquivo FitCraft. Quem recebe no WhatsApp: toque o arquivo e escolha FitCraft. Se não aparecer, use este botão.</p>
          </div>
          ${icons.share}
        </button>
        <div class="row">
          <div>
            <strong>Banco local</strong>
            <p class="muted">SQLite no aparelho — planos, ciclos e exercícios</p>
          </div>
          <strong>OK</strong>
        </div>
        <div class="row">
          <div>
            <strong>Versão instalada</strong>
            <p class="muted">FitCraft 025 — playlist vai com o áudio</p>
          </div>
          <strong>025</strong>
        </div>
      </div>
    `,
    bind(root) {
      root.querySelectorAll("[data-toggle]").forEach((button) => {
        button.addEventListener("click", () => {
          const key = button.dataset.toggle;
          const next = getSetting(key, "1") === "1" ? "0" : "1";
          setSetting(key, next);
          button.querySelector(".switch").classList.toggle("is-on", next === "1");
        });
      });

      root.querySelector("#import-cycle")?.addEventListener("click", () => {
        importCycleFromFile();
      });
    },
  };
}
