import { icons } from "../lib/icons.js";

export function homeView() {
  return `
    <section class="layout-split">
      <div>
        <article class="hero">
          <div class="kicker"><span class="dot"></span> Versão 002</div>
          <h2>Seu cronômetro de treino metabólico.</h2>
          <p>Esta versão só prova o visual e a navegação. Planos, timer real, SQLite e playlist entram nas próximas entregas numeradas.</p>
          <div class="cta-row">
            <button class="btn btn-primary" disabled>Treinar hoje</button>
            <button class="btn btn-ghost" data-go="/planos">Ver planos</button>
          </div>
        </article>

        <h3 class="section-title">Fases do ciclo</h3>
        <div class="grid cols-3">
          <article class="card phase-prep">
            <small>Preparação</small>
            <strong>Nome do 1º exercício</strong>
            <p>Contagem regressiva do aquecimento.</p>
          </article>
          <article class="card phase-train">
            <small>Treino</small>
            <strong>Exercício atual</strong>
            <p>Tempo que você definir para cada movimento.</p>
          </article>
          <article class="card phase-rest">
            <small>Intervalo</small>
            <strong>Próximo exercício</strong>
            <p>Descanso já mostrando o que vem a seguir.</p>
          </article>
        </div>
      </div>

      <aside class="empty">
        <div class="empty-icon">${icons.dumbbell}</div>
        <h3>Nenhum plano ainda</h3>
        <p>Na 003 você cria ciclos de 7, 15 ou 30 dias e dá nomes como Segunda, Terça…</p>
      </aside>
    </section>
  `;
}
