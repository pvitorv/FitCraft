export function buildPhases(cycle, exercises) {
  if (!cycle || !exercises.length) return [];

  const phases = [
    {
      type: "prep",
      label: "Preparação",
      seconds: cycle.prep_seconds,
      title: exercises[0].name,
      hint: "Aquecimento. O primeiro movimento já aparece.",
      exerciseIndex: 0,
    },
  ];

  exercises.forEach((exercise, index) => {
    phases.push({
      type: "work",
      label: "Treino",
      seconds: exercise.work_seconds,
      title: exercise.name,
      hint: "Trabalhe agora.",
      exerciseIndex: index,
    });

    if (index < exercises.length - 1) {
      phases.push({
        type: "rest",
        label: "Intervalo",
        seconds: cycle.rest_seconds,
        title: exercises[index + 1].name,
        hint: "Descanse. Em seguida vem este exercício.",
        exerciseIndex: index,
      });
    }
  });

  return phases;
}

function createEngine() {
  const listeners = new Set();
  let raf = 0;

  const state = {
    cycleId: null,
    phases: [],
    index: 0,
    remainingMs: 0,
    running: false,
    ended: false,
    lastTs: 0,
  };

  function currentPhase() {
    return state.phases[state.index] ?? null;
  }

  function snapshot() {
    const phase = currentPhase();
    const totalMs = (phase?.seconds ?? 1) * 1000;
    return {
      cycleId: state.cycleId,
      phases: state.phases,
      index: state.index,
      phase,
      remainingMs: state.remainingMs,
      displaySeconds: Math.max(0, Math.ceil(state.remainingMs / 1000)),
      progress: phase ? Math.min(1, 1 - state.remainingMs / totalMs) : 1,
      running: state.running,
      ended: state.ended,
      total: state.phases.length,
    };
  }

  function emit() {
    const snap = snapshot();
    listeners.forEach((listener) => listener(snap));
  }

  function stopRaf() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function goTo(index) {
    state.index = index;
    state.ended = index >= state.phases.length;
    const phase = currentPhase();
    state.remainingMs = phase ? phase.seconds * 1000 : 0;
    if (state.ended) {
      state.running = false;
      stopRaf();
    }
    emit();
  }

  function advance() {
    if (state.index >= state.phases.length - 1) {
      state.ended = true;
      state.running = false;
      state.remainingMs = 0;
      stopRaf();
      emit();
      return;
    }
    goTo(state.index + 1);
    if (state.running) {
      state.lastTs = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }

  function tick(ts) {
    if (!state.running) return;
    const delta = ts - state.lastTs;
    state.lastTs = ts;
    state.remainingMs -= delta;
    if (state.remainingMs <= 0) {
      advance();
      return;
    }
    emit();
    raf = requestAnimationFrame(tick);
  }

  return {
    snapshot,
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    load(cycle, exercises) {
      stopRaf();
      state.cycleId = cycle.id;
      state.phases = buildPhases(cycle, exercises);
      state.running = false;
      state.ended = state.phases.length === 0;
      goTo(0);
    },
    start() {
      if (!state.phases.length || state.ended) return;
      state.running = true;
      state.lastTs = performance.now();
      stopRaf();
      raf = requestAnimationFrame(tick);
      emit();
    },
    pause() {
      if (!state.running) return;
      state.running = false;
      stopRaf();
      emit();
    },
    toggle() {
      if (state.ended) return;
      if (state.running) this.pause();
      else this.start();
    },
    skip() {
      if (state.ended) return;
      advance();
    },
    reset() {
      if (!state.phases.length) return;
      state.running = false;
      stopRaf();
      goTo(0);
    },
    leave() {
      this.pause();
    },
  };
}

export const timerEngine = createEngine();
