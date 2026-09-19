const STATIC = {
  "/": "home",
  "/planos": "planos",
  "/planos/novo": "planoNovo",
  "/treino": "treino",
  "/playlist": "playlist",
  "/ajustes": "ajustes",
};

export function parseRoute() {
  const hash = window.location.hash.replace("#", "") || "/";
  if (STATIC[hash]) {
    return {
      name: STATIC[hash],
      path: hash,
      nav: hash.startsWith("/planos") ? "/planos" : hash,
      params: {},
    };
  }

  const planMatch = hash.match(/^\/planos\/(\d+)$/);
  if (planMatch) {
    return {
      name: "plano",
      path: hash,
      nav: "/planos",
      params: { id: Number(planMatch[1]) },
    };
  }

  return { name: "home", path: "/", nav: "/", params: {} };
}

export function currentPath() {
  return parseRoute().nav;
}

export function go(path) {
  const next = path.startsWith("#") ? path.slice(1) : path;
  if ((window.location.hash.replace("#", "") || "/") === next) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.location.hash = next;
}
