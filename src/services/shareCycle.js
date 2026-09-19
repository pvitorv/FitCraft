import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { buildCyclePack, fileNameForPack, stringifyCyclePack } from "../lib/cyclePack.js";
import { buildPlaylistPack, fileNameForPlaylistPack } from "../lib/playlistPack.js";

function downloadText(name, body) {
  const blob = new Blob([body], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function fileUrlFromUri(uri) {
  if (!uri) return "";
  if (uri.startsWith("file:")) return uri;
  if (uri.startsWith("/")) return `file://${uri}`;
  return `file://${uri}`;
}

async function shareWebFile(name, body, title) {
  const file = new File([body], name, { type: "application/json" });
  if (!navigator.canShare?.({ files: [file] })) {
    return false;
  }
  await navigator.share({
    files: [file],
    title,
  });
  return true;
}

export async function shareOrSaveText(name, body, title, dialogTitle = "Enviar FitCraft") {
  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({
      path: name,
      data: body,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const { uri } = await Filesystem.getUri({
      path: name,
      directory: Directory.Cache,
    });
    await Share.share({
      files: [fileUrlFromUri(uri)],
      dialogTitle,
    });
    return "shared";
  }

  try {
    if (await shareWebFile(name, body, title)) {
      return "shared";
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
  }

  downloadText(name, body);
  return "downloaded";
}

export async function shareOrSaveCycle(cycleId) {
  const pack = buildCyclePack(cycleId);
  const body = stringifyCyclePack(pack);
  const name = fileNameForPack(pack);
  const title = `Ciclo FitCraft: ${pack.cycle.name}`;
  return shareOrSaveText(name, body, title, "Enviar ciclo .fitcraft");
}

export async function shareOrSavePlaylist(playlistId) {
  const pack = buildPlaylistPack(playlistId);
  const body = `${JSON.stringify(pack, null, 2)}\n`;
  const name = fileNameForPlaylistPack(pack);
  const title = `Playlist FitCraft: ${pack.playlist.name}`;
  return shareOrSaveText(name, body, title, "Enviar playlist .fitcraft");
}
