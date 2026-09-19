export const routes = {
  "/": "home",
  "/planos": "planos",
  "/treino": "treino",
  "/playlist": "playlist",
  "/ajustes": "ajustes",
};

export function currentPath() {
  const hash = window.location.hash.replace("#", "") || "/";
  return routes[hash] ? hash : "/";
}

export function go(path) {
  if (window.location.hash.replace("#", "") === path) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.location.hash = path;
}
