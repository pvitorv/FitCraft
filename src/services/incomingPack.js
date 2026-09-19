import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { base64ToUint8, looksLikeJson, looksLikeZip } from "../lib/bytes.js";
import { CYCLE_PACK_KIND, parseCyclePack } from "../lib/cyclePack.js";
import { applyPlaylistArchive, parsePlaylistArchive } from "../lib/playlistPack.js";
import { persistNow } from "../database/connection.js";
import { go } from "../routes.js";
import { openImportCycleModal } from "../views/importCycleModal.js";

const INCOMING_NAME = "incoming.fitcraft";
let busy = false;

async function readIncomingBytes() {
  try {
    const file = await Filesystem.readFile({
      path: INCOMING_NAME,
      directory: Directory.Cache,
    });
    await Filesystem.deleteFile({
      path: INCOMING_NAME,
      directory: Directory.Cache,
    });
    return base64ToUint8(file.data);
  } catch {
    return null;
  }
}

export async function consumeIncomingFitcraft() {
  if (!Capacitor.isNativePlatform() || busy) return;
  const bytes = await readIncomingBytes();
  if (!bytes?.length) return;

  busy = true;
  try {
    if (looksLikeZip(bytes)) {
      const pack = parsePlaylistArchive(bytes);
      const created = await applyPlaylistArchive(pack);
      await persistNow();
      alert(`Playlist “${created.name}” chegou com o áudio.`);
      go(`/playlist/${created.id}`);
      return;
    }

    if (!looksLikeJson(bytes)) return;
    const text = new TextDecoder().decode(bytes);
    const raw = JSON.parse(text);
    if (raw?.kind === CYCLE_PACK_KIND) {
      openImportCycleModal({
        pack: parseCyclePack(text),
        onApplied: (cycle) => go(`/planos/${cycle.plan_id}/ciclos/${cycle.id}`),
      });
    }
  } catch {
    // Outro app pode mandar um arquivo que não é do FitCraft
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
