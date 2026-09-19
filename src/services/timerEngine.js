export function cycleSignature(cycle, exercises) {
  return `${cycle.id}:${cycle.prep_seconds}:${cycle.rest_seconds}:${cycle.rounds}:${exercises
    .map((item) => `${item.id}-${item.work_seconds}-${item.name}`)
    .join("|")}`;
}

export function buildPhases(cycle, exercises) {
  if (!cycle || !exercises.length) return [];

  const rounds = Math.min(30, Math.max(1, Number(cycle.rounds) || 1));
  const phases = [
    {
      type: "prep",
      label: "Preparação",
      seconds: cycle.prep_seconds,
      title: exercises[0].name,
      hint: "Aquecimento. O primeiro movimento já aparece.",
      exerciseIndex: 0,
      round: 1,
      rounds,
    },
  ];

  for (let round = 0; round < rounds; round += 1) {
    exercises.forEach((exercise, index) => {
      phases.push({
        type: "work",
        label: "Treino",
        seconds: exercise.work_seconds,
        title: exercise.name,
        hint: rounds > 1 ? `Série ${round + 1} de ${rounds}. Trabalhe agora.` : "Trabalhe agora.",
        exerciseIndex: index,
        round: round + 1,
        rounds,
      });

      const lastExercise = index === exercises.length - 1;
      const lastRound = round === rounds - 1;
      if (lastExercise && lastRound) return;

      const next = lastExercise ? exercises[0] : exercises[index + 1];
      phases.push({
        type: "rest",
        label: "Intervalo",
        seconds: cycle.rest_seconds,
        title: next.name,
        hint: lastExercise
          ? `Intervalo. Sem preparação de novo. A série ${round + 2} começa com ${next.name}.`
          : "Intervalo. Em seguida vem este exercício.",
        exerciseIndex: index,
        round: round + 1,
        rounds,
      });
    });
  }

  const prepCount = phases.filter((phase) => phase.type === "prep").length;
  if (prepCount !== 1) {
    throw new Error("Preparação deve existir uma única vez, só no início.");
  }

  return phases;
}

function createEngine() {
  const listeners = new Set();
  let raf = 0;

  const state = {
    cycleId: null,
    signature: "",
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
      signature: state.signature,
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
      state.signature = cycleSignature(cycle, exercises);
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
