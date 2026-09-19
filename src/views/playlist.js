import { icons } from "../lib/icons.js";

export function playlistView() {
  return `
    <article class="hero">
      <div class="kicker"><span class="dot"></span> Playlist 0/15</div>
      <h2>Hits no aparelho, não na nuvem.</h2>
      <p>Até 15 faixas importadas do seu celular. Liga/desliga independente do timer. Pause da música é outro botão.</p>
    </article>
    <div class="empty">
      <div class="empty-icon">${icons.music}</div>
      <h3>Player chega na 006</h3>
      <p>Você vai importar arquivos que já possui. O FitCraft não baixa música de YouTube nem Spotify.</p>
    </div>
  `;
}
