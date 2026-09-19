import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { uint8ToBase64 } from "../lib/bytes.js";
import { buildCyclePack, fileNameForPack, stringifyCyclePack } from "../lib/cyclePack.js";
import { buildPlaylistArchive } from "../lib/playlistPack.js";

function fileUrlFromUri(uri) {
  if (!uri) return "";
  if (uri.startsWith("file:")) return uri;
  if (uri.startsWith("/")) return `file://${uri}`;
  return `file://${uri}`;
}

function downloadBlob(name, blob) {
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

async function shareNativeFile(name, data, dialogTitle, encoding) {
  await Filesystem.writeFile({
    path: name,
    data,
    directory: Directory.Cache,
    ...(encoding ? { encoding } : {}),
  });
  const { uri } = await Filesystem.getUri({
    path: name,
    directory: Directory.Cache,
  });
  await Share.share({
    files: [fileUrlFromUri(uri)],
    dialogTitle,
  });
}

async function shareWebFile(file) {
  if (!navigator.canShare?.({ files: [file] })) return false;
  await navigator.share({ files: [file] });
  return true;
}

export async function shareOrSaveText(name, body, _title, dialogTitle = "Enviar FitCraft") {
  if (Capacitor.isNativePlatform()) {
    await shareNativeFile(name, body, dialogTitle, Encoding.UTF8);
    return "shared";
  }

  const file = new File([body], name, { type: "application/json" });
  try {
    if (await shareWebFile(file)) return "shared";
  } catch (error) {
    if (error?.name === "AbortError") throw error;
  }
  downloadBlob(name, new Blob([body], { type: "application/json" }));
  return "downloaded";
}

export async function shareOrSaveBytes(name, bytes, mime, dialogTitle = "Enviar FitCraft") {
  if (Capacitor.isNativePlatform()) {
    await shareNativeFile(name, uint8ToBase64(bytes), dialogTitle);
    return "shared";
  }

  const file = new File([bytes], name, { type: mime || "application/octet-stream" });
  try {
    if (await shareWebFile(file)) return "shared";
  } catch (error) {
    if (error?.name === "AbortError") throw error;
  }
  downloadBlob(name, new Blob([bytes], { type: mime || "application/octet-stream" }));
  return "downloaded";
}

export async function shareOrSaveCycle(cycleId) {
  const pack = buildCyclePack(cycleId);
  return shareOrSaveText(fileNameForPack(pack), stringifyCyclePack(pack), pack.cycle.name, "Enviar ciclo FitCraft");
}

export async function shareOrSavePlaylist(playlistId) {
  const archive = await buildPlaylistArchive(playlistId);
  return shareOrSaveBytes(archive.name, archive.bytes, archive.mime, "Enviar playlist FitCraft");
}
