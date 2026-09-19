import { renameCycle } from "../models/Cycle.js";
import { renameExercise } from "../models/Exercise.js";
import { renamePlan } from "../models/Plan.js";
import { setMotto } from "../models/Profile.js";

function saveName(action) {
  try {
    action();
    return true;
  } catch {
    return false;
  }
}

export function flushEdits(root = document) {
  const motto = root.querySelector("#motto");
  if (motto) setMotto(motto.value);

  const planName = root.querySelector("#plan-name");
  if (planName?.dataset.planId && planName.value.trim()) {
    saveName(() => renamePlan(Number(planName.dataset.planId), planName.value));
  }

  const cycleName = root.querySelector("#cycle-name");
  if (cycleName?.dataset.cycleId && cycleName.value.trim()) {
    saveName(() => renameCycle(Number(cycleName.dataset.cycleId), cycleName.value));
  }

  root.querySelectorAll(".exercise-name").forEach((field) => {
    const id = Number(field.dataset.exerciseId);
    if (!id || !field.value.trim()) return;
    if (saveName(() => renameExercise(id, field.value))) {
      const title = root.querySelector(`[data-title-for="${id}"]`);
      if (title) title.textContent = field.value.trim();
    }
  });
}
