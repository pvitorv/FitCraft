import { icons } from "../lib/icons.js";
import { currentPath, go } from "../routes.js";

const nav = [
  { path: "/", id: "home", label: "Início", icon: icons.home },
  { path: "/planos", id: "planos", label: "Planos", icon: icons.plans },
  { path: "/treino", id: "treino", label: "Treino", icon: icons.timer },
  { path: "/playlist", id: "playlist", label: "Playlist", icon: icons.music },
  { path: "/ajustes", id: "ajustes", label: "Ajustes", icon: icons.settings },
];

export function renderShell(innerHtml) {
  const path = currentPath();

  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">${icons.logo}</div>
          <div>
            <h1>FitCraft</h1>
            <p>Timer metabólico offline</p>
          </div>
        </div>
        <span class="version-chip">015</span>
      </header>
      <main class="screen">${innerHtml}</main>
      <nav class="bottom-nav">
        ${nav
          .map(
            (item) => `
              <button class="nav-btn ${item.path === path ? "active" : ""}" data-go="${item.path}">
                ${item.icon}
                <span>${item.label}</span>
              </button>
            `,
          )
          .join("")}
      </nav>
    </div>
  `;
}

export function bindNavigation(root) {
  root.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => go(button.dataset.go));
  });
}
