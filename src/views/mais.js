import { escapeHtml } from "../lib/html.js";
import { icons } from "../lib/icons.js";

export async function maisScreen() {
  return {
    html: `
      <article class="hero">
        <div class="kicker"><span class="dot"></span> Mais</div>
        <h2>Playlist, planos e o aparelho.</h2>
        <p>O que não cabe na barra de baixo fica aqui.</p>
      </article>
      <div class="list" style="margin-top:16px">
        <button class="row" data-go="/playlist">
          <div>
            <strong>Playlist</strong>
            <p class="muted">Summer Eletrohits e envio da lista de faixas.</p>
          </div>
          ${icons.music}
        </button>
        <button class="row" data-go="/planos">
          <div>
            <strong>Planos de treino</strong>
            <p class="muted">7, 14 ou 28 ciclos. Playlist vai com o áudio.</p>
          </div>
          ${icons.plans}
        </button>
        <button class="row" data-go="/ajustes">
          <div>
            <strong>Ajustes</strong>
            <p class="muted">Som, tela ligada e receber ciclo.</p>
          </div>
          ${icons.settings}
        </button>
      </div>
    `,
  };
}
