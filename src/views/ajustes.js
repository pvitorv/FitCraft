export async function ajustesScreen() {
  return {
    html: `
      <article class="hero">
        <div class="kicker"><span class="dot"></span> Ajustes</div>
        <h2>Tudo no aparelho.</h2>
        <p>O SQLite já guarda seus planos neste celular. Backup em arquivo entra no polimento.</p>
      </article>
      <div class="list" style="margin-top:16px">
        <div class="row">
          <div>
            <strong>Manter tela ligada</strong>
            <p class="muted">Durante o treino. Ativo a partir da 005.</p>
          </div>
          <div class="switch" aria-hidden="true"></div>
        </div>
        <div class="row">
          <div>
            <strong>Som e vibração</strong>
            <p class="muted">Beep nos últimos 3 segundos de cada fase.</p>
          </div>
          <div class="switch" aria-hidden="true"></div>
        </div>
        <div class="row">
          <div>
            <strong>Banco local</strong>
            <p class="muted">SQLite no aparelho — planos, ciclos e exercícios</p>
          </div>
          <strong>OK</strong>
        </div>
        <div class="row">
          <div>
            <strong>Versão instalada</strong>
            <p class="muted">FitCraft 004 — exercícios do ciclo</p>
          </div>
          <strong>004</strong>
        </div>
      </div>
    `,
  };
}
