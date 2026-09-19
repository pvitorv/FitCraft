import { icons } from "../lib/icons.js";

export function planosView() {
  return `
    <article class="hero">
      <div class="kicker"><span class="dot"></span> Planos</div>
      <h2>7, 15 ou 30 ciclos.</h2>
      <p>Um ciclo por dia. Você escolhe a demanda semanal, quinzenal ou mensal e nomeia cada dia.</p>
    </article>
    <div class="empty">
      <div class="empty-icon">${icons.plans}</div>
      <h3>Cadastro chega na 003</h3>
      <p>Aqui vão aparecer seus planos e a lista de ciclos. O cadastro entra na 003.</p>
    </div>
  `;
}
