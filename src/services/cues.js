import { getSetting } from "../models/Setting.js";

let audio;
let lastPhaseKey = "";
let lastTickSecond = null;

function context() {
  if (!audio) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audio = new Ctx();
  }
  return audio;
}

function beep(frequency, duration = 0.08) {
  const ctx = context();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.08;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
}

function vibrate(ms) {
  navigator.vibrate?.(ms);
}

export function unlockCues() {
  const ctx = context();
  ctx?.resume();
}

export function playCues(snapshot) {
  if (getSetting("beep_enabled", "1") !== "1") return;
  if (!snapshot.phase) return;

  const phaseKey = `${snapshot.index}-${snapshot.phase.type}`;
  if (!snapshot.running && !snapshot.ended) {
    lastPhaseKey = phaseKey;
    lastTickSecond = null;
    return;
  }
  if (phaseKey !== lastPhaseKey) {
    lastPhaseKey = phaseKey;
    lastTickSecond = null;
    if (snapshot.ended) {
      beep(523, 0.16);
      vibrate([40, 40, 80]);
      return;
    }
    beep(snapshot.phase.type === "work" ? 494 : 330, 0.1);
    vibrate(35);
  }

  if (!snapshot.running || snapshot.ended) return;
  const seconds = snapshot.displaySeconds;
  if (seconds <= 3 && seconds > 0 && lastTickSecond !== seconds) {
    lastTickSecond = seconds;
    beep(seconds === 1 ? 880 : 698, 0.07);
    vibrate(18);
  }
}

export function resetCues() {
  lastPhaseKey = "";
  lastTickSecond = null;
}
