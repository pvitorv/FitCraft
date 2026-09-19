export function ajustesView() {
  return `
    <article class="hero">
      <div class="kicker"><span class="dot"></span> Ajustes</div>
      <h2>Tudo no aparelho.</h2>
      <p>Sem conta, sem loja, sem servidor. Quando o banco existir, o backup também sai daqui.</p>
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
          <strong>Versão instalada</strong>
          <p class="muted">FitCraft 002 — cores das fases</p>
        </div>
        <strong>002</strong>
      </div>
    </div>
  `;
}
