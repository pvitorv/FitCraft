import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { buildCyclePack, fileNameForPack, stringifyCyclePack } from "../lib/cyclePack.js";

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

async function shareNative(name, body, title) {
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
    title,
    text: title,
    files: [uri],
    dialogTitle: "Enviar ciclo FitCraft",
  });
}

async function shareWebFile(name, body, title) {
  const file = new File([body], name, { type: "application/json" });
  if (!navigator.canShare?.({ files: [file] })) {
    return false;
  }
  await navigator.share({
    files: [file],
    title,
    text: title,
  });
  return true;
}

export async function shareOrSaveCycle(cycleId) {
  const pack = buildCyclePack(cycleId);
  const body = stringifyCyclePack(pack);
  const name = fileNameForPack(pack);
  const title = `Ciclo FitCraft: ${pack.cycle.name}`;

  if (Capacitor.isNativePlatform()) {
    await shareNative(name, body, title);
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
