export async function treinoScreen() {
  return {
    html: `
      <div class="timer-preview">
        <div class="phase-label">PREPARAÇÃO</div>
        <div class="ring">
          <div class="ring-inner">
            <div class="clock">00:10</div>
          </div>
        </div>
        <div class="exercise-name">Burpee</div>
        <p class="muted">Prévia visual. O temporizador de verdade entra na 005.</p>
        <div class="controls">
          <button class="btn btn-ghost" disabled>Pular</button>
          <button class="btn btn-primary" disabled>Pausar timer</button>
          <button class="btn btn-ghost" disabled>Música</button>
        </div>
      </div>
    `,
  };
}
