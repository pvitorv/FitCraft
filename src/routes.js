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

  const cycleMatch = hash.match(/^\/planos\/(\d+)\/ciclos\/(\d+)$/);
  if (cycleMatch) {
    return {
      name: "ciclo",
      path: hash,
      nav: "/planos",
      params: { id: Number(cycleMatch[1]), cycleId: Number(cycleMatch[2]) },
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
