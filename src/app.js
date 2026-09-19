import "./styles/app.css";
import { bootDb } from "./database/connection.js";
import { escapeHtml } from "./lib/html.js";
import { parseRoute } from "./routes.js";
import { bindNavigation, renderShell } from "./views/layout.js";
import { homeScreen } from "./views/home.js";
import { cicloScreen } from "./views/ciclo.js";
import { planoNovoScreen, planoScreen, planosScreen } from "./views/planos.js";
import { timerEngine } from "./services/timerEngine.js";
import { releaseAwake } from "./services/wakeLock.js";
import { treinoScreen } from "./views/treino.js";
import { playlistScreen } from "./views/playlist.js";
import { ajustesScreen } from "./views/ajustes.js";

const screens = {
  home: homeScreen,
  planos: planosScreen,
  planoNovo: planoNovoScreen,
  plano: planoScreen,
  ciclo: cicloScreen,
  treino: treinoScreen,
  playlist: playlistScreen,
  ajustes: ajustesScreen,
};

async function render() {
  const root = document.querySelector("#app");
  const route = parseRoute();
  if (route.name !== "treino") {
    timerEngine.leave();
    releaseAwake();
  }
  const screen = screens[route.name] ?? homeScreen;
  const { html, bind } = await screen(route.params);
  root.innerHTML = renderShell(html);
  bindNavigation(root);
  bind?.(root);
}

bootDb()
  .then(() => {
    window.addEventListener("hashchange", render);
    return render();
  })
  .catch((error) => {
    document.querySelector("#app").innerHTML = `
      <main class="screen">
        <div class="empty">
          <h3>Não foi possível abrir o banco</h3>
          <p>${escapeHtml(error.message)}</p>
        </div>
      </main>
    `;
  });
