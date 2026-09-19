import { getSetting } from "../models/Setting.js";

let lock = null;

export async function keepAwake() {
  if (getSetting("keep_screen_on", "1") !== "1") return;
  if (!navigator.wakeLock?.request) return;
  try {
    lock = await navigator.wakeLock.request("screen");
    lock.addEventListener("release", () => {
      lock = null;
    });
  } catch {
    lock = null;
  }
}

export async function releaseAwake() {
  try {
    await lock?.release();
  } catch {
    // already released
  }
  lock = null;
}
