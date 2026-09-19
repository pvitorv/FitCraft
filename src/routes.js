const STATIC = {
  "/": "home",
  "/planos": "planos",
  "/planos/novo": "planoNovo",
  "/treino": "treino",
  "/playlist": "playlist",
  "/ajustes": "ajustes",
  "/mais": "mais",
  "/financeiro": "financeiro",
  "/nutricao": "nutricao",
};

function navFor(hash) {
  if (hash.startsWith("/planos")) return "/planos";
  if (hash.startsWith("/treino")) return "/treino";
  if (hash.startsWith("/financeiro")) return "/financeiro";
  if (hash.startsWith("/nutricao")) return "/nutricao";
  if (hash.startsWith("/playlist") || hash === "/ajustes" || hash === "/mais") return "/mais";
  return hash;
}

export function parseRoute() {
  const hash = window.location.hash.replace("#", "") || "/";
  if (STATIC[hash]) {
    return {
      name: STATIC[hash],
      path: hash,
      nav: navFor(hash),
      params: {},
    };
  }

  const treinoMatch = hash.match(/^\/treino\/(\d+)$/);
  if (treinoMatch) {
    return {
      name: "treino",
      path: hash,
      nav: "/treino",
      params: { cycleId: Number(treinoMatch[1]) },
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

  const playlistMatch = hash.match(/^\/playlist\/(\d+)$/);
  if (playlistMatch) {
    return {
      name: "playlist",
      path: hash,
      nav: "/mais",
      params: { id: Number(playlistMatch[1]) },
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

  const financeMatch = hash.match(/^\/financeiro\/(\d{4}-\d{2})$/);
  if (financeMatch) {
    return {
      name: "financeiro",
      path: hash,
      nav: "/financeiro",
      params: { month: financeMatch[1] },
    };
  }

  const nutritionMatch = hash.match(/^\/nutricao\/(semana|mes)\/(\d{4}-\d{2}-\d{2})$/);
  if (nutritionMatch) {
    return {
      name: "nutricao",
      path: hash,
      nav: "/nutricao",
      params: { scope: nutritionMatch[1], day: nutritionMatch[2] },
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
