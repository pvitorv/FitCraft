import "./styles/app.css";
import { currentPath } from "./routes.js";
import { bindNavigation, renderShell } from "./views/layout.js";
import { homeView } from "./views/home.js";
import { planosView } from "./views/planos.js";
import { treinoView } from "./views/treino.js";
import { playlistView } from "./views/playlist.js";
import { ajustesView } from "./views/ajustes.js";

const views = {
  "/": homeView,
  "/planos": planosView,
  "/treino": treinoView,
  "/playlist": playlistView,
  "/ajustes": ajustesView,
};

function render() {
  const root = document.querySelector("#app");
  const path = currentPath();
  root.innerHTML = renderShell(views[path]());
  bindNavigation(root);
}

window.addEventListener("hashchange", render);
render();
