import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { CYCLE_PACK_KIND, parseCyclePack } from "../lib/cyclePack.js";
import { PLAYLIST_PACK_KIND, applyPlaylistPack, parsePlaylistPack } from "../lib/playlistPack.js";
import { persistNow } from "../database/connection.js";
import { go } from "../routes.js";
import { openImportCycleModal } from "../views/importCycleModal.js";

const INCOMING_NAME = "incoming.fitcraft";
let busy = false;

async function readIncomingText() {
  try {
    const file = await Filesystem.readFile({
      path: INCOMING_NAME,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Filesystem.deleteFile({
      path: INCOMING_NAME,
      directory: Directory.Cache,
    });
    return String(file.data || "");
  } catch {
    return "";
  }
}

export async function consumeIncomingFitcraft() {
  if (!Capacitor.isNativePlatform() || busy) return;
  const text = await readIncomingText();
  if (!text.trim()) return;

  busy = true;
  try {
    const raw = JSON.parse(text);
    if (raw?.kind === CYCLE_PACK_KIND) {
      openImportCycleModal({
        pack: parseCyclePack(text),
        onApplied: (cycle) => go(`/planos/${cycle.plan_id}/ciclos/${cycle.id}`),
      });
      return;
    }
    if (raw?.kind === PLAYLIST_PACK_KIND) {
      const pack = parsePlaylistPack(text);
      const created = applyPlaylistPack(pack);
      await persistNow();
      alert(`Playlist “${created.name}” chegou. Importe os arquivos de áudio que você já tem — o FitCraft não envia música.`);
      go(`/playlist/${created.id}`);
    }
  } catch {
    // Outro app pode mandar um arquivo que não é .fitcraft
  } finally {
    busy = false;
  }
}

export function bindIncomingFitcraft() {
  consumeIncomingFitcraft();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") consumeIncomingFitcraft();
  });
  window.addEventListener("focus", () => consumeIncomingFitcraft());
}
