export function formatBRL(cents) {
  const value = (Number(cents) || 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseReais(text) {
  const normalized = String(text || "")
    .replace(/\s/g, "")
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".");
  return Number(normalized);
}
