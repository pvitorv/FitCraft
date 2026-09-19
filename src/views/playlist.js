import { icons } from "../lib/icons.js";

export async function playlistScreen() {
  return {
    html: `
      <article class="hero">
        <div class="kicker"><span class="dot"></span> Playlist 0/15</div>
        <h2>Hits no aparelho, não na nuvem.</h2>
        <p>Até 15 faixas importadas do seu celular. Liga/desliga independente do timer. Pause da música é outro botão.</p>
      </article>
      <div class="empty">
        <div class="empty-icon">${icons.music}</div>
        <h3>Player chega na 006</h3>
        <p>Na 006 nascem as playlists Summer Eletrohits 1, 2 e 3. Você importa os arquivos que já tem.</p>
      </div>
    `,
  };
}
