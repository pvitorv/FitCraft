import { clampSeconds } from "./time.js";
import { cycleRounds, findCycle, renameCycle, setCycleRounds, setCycleTimes } from "../models/Cycle.js";
import {
  addExercise,
  deleteExercise,
  listExercises,
  setExerciseWork,
} from "../models/Exercise.js";

export const CYCLE_PACK_KIND = "fitcraft.cycle";
export const CYCLE_PACK_FORMAT = 1;
export const CYCLE_FILE_EXT = ".fitcraft.json";
const MAX_BYTES = 200_000;
const MAX_EXERCISES = 40;
const MAX_NAME = 120;

export function buildCyclePack(cycleId) {
  const cycle = findCycle(cycleId);
  if (!cycle) {
    throw new Error("Ciclo não encontrado.");
  }

  const exercises = listExercises(cycleId);
  if (!exercises.length) {
    throw new Error("Monte pelo menos um exercício antes de compartilhar.");
  }

  return {
    kind: CYCLE_PACK_KIND,
    format: CYCLE_PACK_FORMAT,
    app: "FitCraft",
    exportedAt: new Date().toISOString(),
    cycle: {
      name: String(cycle.name || "Ciclo").slice(0, MAX_NAME),
      prepSeconds: clampSeconds(cycle.prep_seconds, 3, 600),
      restSeconds: clampSeconds(cycle.rest_seconds, 5, 600),
      rounds: cycleRounds(cycle),
      exercises: exercises.map((exercise) => ({
        name: String(exercise.name || "Exercício").slice(0, MAX_NAME),
        workSeconds: clampSeconds(exercise.work_seconds, 5, 1800),
      })),
    },
  };
}

export function stringifyCyclePack(pack) {
  return `${JSON.stringify(pack, null, 2)}\n`;
}

export function fileNameForPack(pack) {
  const slug =
    String(pack?.cycle?.name || "ciclo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "ciclo";
  return `FitCraft-${slug}${CYCLE_FILE_EXT}`;
}

export function parseCyclePack(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Arquivo vazio.");
  }
  if (new Blob([text]).size > MAX_BYTES) {
    throw new Error("Arquivo grande demais para um ciclo.");
  }

  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Este arquivo não é um ciclo FitCraft.");
  }

  if (!raw || raw.kind !== CYCLE_PACK_KIND) {
    throw new Error("Este arquivo não é um ciclo FitCraft.");
  }
  if (Number(raw.format) !== CYCLE_PACK_FORMAT) {
    throw new Error("Esta versão do arquivo o app ainda não lê.");
  }

  const source = raw.cycle;
  if (!source || typeof source !== "object") {
    throw new Error("O ciclo dentro do arquivo está incompleto.");
  }

  const name = String(source.name || "").trim().slice(0, MAX_NAME);
  if (!name) {
    throw new Error("O ciclo do arquivo não tem nome.");
  }

  if (!Array.isArray(source.exercises) || !source.exercises.length) {
    throw new Error("O arquivo não tem exercícios.");
  }
  if (source.exercises.length > MAX_EXERCISES) {
    throw new Error(`O arquivo tem mais de ${MAX_EXERCISES} exercícios.`);
  }

  const exercises = source.exercises.map((item, index) => {
    const exerciseName = String(item?.name || "").trim().slice(0, MAX_NAME);
    if (!exerciseName) {
      throw new Error(`O exercício ${index + 1} veio sem nome.`);
    }
    return {
      name: exerciseName,
      workSeconds: clampSeconds(item.workSeconds ?? item.work_seconds, 5, 1800),
    };
  });

  return {
    kind: CYCLE_PACK_KIND,
    format: CYCLE_PACK_FORMAT,
    app: "FitCraft",
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
    cycle: {
      name,
      prepSeconds: clampSeconds(source.prepSeconds ?? source.prep_seconds, 3, 600),
      restSeconds: clampSeconds(source.restSeconds ?? source.rest_seconds, 5, 600),
      rounds: Math.min(30, Math.max(1, Math.round(Number(source.rounds) || 1))),
      exercises,
    },
  };
}

export async function readCyclePackFromFile(file) {
  if (!file) {
    throw new Error("Escolha um arquivo .fitcraft.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Arquivo grande demais para um ciclo.");
  }
  return parseCyclePack(await file.text());
}

export function replaceExercisesFromPack(cycleId, exercises) {
  listExercises(cycleId).forEach((exercise) => deleteExercise(exercise.id));
  exercises.forEach((item) => {
    const created = addExercise(cycleId, item.name);
    setExerciseWork(created.id, item.workSeconds);
  });
}

export function applyCyclePack(cycleId, pack, { keepName = true } = {}) {
  const cycle = findCycle(cycleId);
  if (!cycle) {
    throw new Error("Ciclo de destino não encontrado.");
  }

  setCycleTimes(cycleId, {
    prepSeconds: pack.cycle.prepSeconds,
    restSeconds: pack.cycle.restSeconds,
  });
  setCycleRounds(cycleId, pack.cycle.rounds);
  replaceExercisesFromPack(cycleId, pack.cycle.exercises);

  if (!keepName) {
    renameCycle(cycleId, pack.cycle.name);
  }

  return findCycle(cycleId);
}

export function pickCycleFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".fitcraft,.fitcraft.json,.json,application/json,text/plain";
    input.addEventListener(
      "change",
      () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error("Nenhum arquivo escolhido."));
          return;
        }
        resolve(file);
      },
      { once: true },
    );
    input.addEventListener(
      "cancel",
      () => reject(new DOMException("Cancelado", "AbortError")),
      { once: true },
    );
    input.click();
  });
}

export function isAbortError(error) {
  return error?.name === "AbortError" || /cancel/i.test(String(error?.message || ""));
}
