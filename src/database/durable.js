import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { base64ToUint8, uint8ToBase64 } from "../lib/bytes.js";

const SQLITE_PATH = "backup/fitcraft.sqlite";
const AUDIO_DIR = "backup/audio";
const BLOB_DIR = "backup/blobs";

function native() {
  return Capacitor.isNativePlatform();
}

function fileName(key) {
  return String(key || "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 80);
}

async function fileExists(path) {
  try {
    await Filesystem.stat({ path, directory: Directory.Data });
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(path) {
  try {
    await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true });
  } catch {
    // já existe
  }
}

export async function readDurableSqlite() {
  if (!native()) return null;
  try {
    const file = await Filesystem.readFile({ path: SQLITE_PATH, directory: Directory.Data });
    const bytes = base64ToUint8(file.data);
    return bytes.length ? bytes : null;
  } catch {
    return null;
  }
}

export async function writeDurableSqlite(bytes) {
  if (!native() || !bytes?.length) return;
  await ensureDir("backup");
  await Filesystem.writeFile({
    path: SQLITE_PATH,
    data: uint8ToBase64(bytes),
    directory: Directory.Data,
  });
}

export async function writeDurableAudio(key, blob) {
  if (!native() || !key || !blob) return;
  await ensureDir(AUDIO_DIR);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await Filesystem.writeFile({
    path: `${AUDIO_DIR}/${fileName(key)}`,
    data: uint8ToBase64(bytes),
    directory: Directory.Data,
  });
}

export async function readDurableAudio(key, mime = "audio/mpeg") {
  if (!native() || !key) return null;
  try {
    const file = await Filesystem.readFile({
      path: `${AUDIO_DIR}/${fileName(key)}`,
      directory: Directory.Data,
    });
    const bytes = base64ToUint8(file.data);
    return bytes.length ? new Blob([bytes], { type: mime || "audio/mpeg" }) : null;
  } catch {
    return null;
  }
}

export async function durableAudioExists(key) {
  if (!native() || !key) return false;
  return fileExists(`${AUDIO_DIR}/${fileName(key)}`);
}

export async function deleteDurableAudio(key) {
  if (!native() || !key) return;
  try {
    await Filesystem.deleteFile({ path: `${AUDIO_DIR}/${fileName(key)}`, directory: Directory.Data });
  } catch {
    // arquivo já não estava lá
  }
}

export async function writeDurableBlob(key, blob) {
  if (!native() || !key || !blob) return;
  await ensureDir(BLOB_DIR);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await Filesystem.writeFile({
    path: `${BLOB_DIR}/${fileName(key)}`,
    data: uint8ToBase64(bytes),
    directory: Directory.Data,
  });
}

export async function readDurableBlob(key, mime = "image/jpeg") {
  if (!native() || !key) return null;
  try {
    const file = await Filesystem.readFile({
      path: `${BLOB_DIR}/${fileName(key)}`,
      directory: Directory.Data,
    });
    const bytes = base64ToUint8(file.data);
    return bytes.length ? new Blob([bytes], { type: mime }) : null;
  } catch {
    return null;
  }
}

export async function durableBlobExists(key) {
  if (!native() || !key) return false;
  return fileExists(`${BLOB_DIR}/${fileName(key)}`);
}
