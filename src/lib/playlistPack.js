import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { getAudio } from "../database/connection.js";
import { createPlaylist, findPlaylist, listPlaylists, MAX_TRACKS } from "../models/Playlist.js";
import { addPackedTrack, isPendingTrack, listTracks } from "../models/Track.js";
import { isAbortError, pickCycleFile } from "./cyclePack.js";
import { looksLikeZip } from "./bytes.js";

export const PLAYLIST_PACK_KIND = "fitcraft.playlist";
export const PLAYLIST_PACK_FORMAT = 2;
export const PLAYLIST_FILE_EXT = ".fitcraft.zip";
const MAX_ZIP_BYTES = 95 * 1024 * 1024;

const MIME_EXT = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/opus": "opus",
};

function slugName(value, fallback = "playlist") {
  return (
    String(value || fallback)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || fallback
  );
}

function extForMime(mime) {
  return MIME_EXT[String(mime || "").toLowerCase()] || "mp3";
}

export async function buildPlaylistArchive(playlistId) {
  const playlist = findPlaylist(playlistId);
  if (!playlist) throw new Error("Playlist não encontrada.");
  const tracks = listTracks(playlistId).filter((track) => !isPendingTrack(track));
  if (!tracks.length) {
    throw new Error("Importe o áudio das faixas antes de enviar a playlist.");
  }

  const zipFiles = {};
  const packed = [];

  for (let index = 0; index < tracks.length; index += 1) {
    const track = tracks[index];
    const blob = await getAudio(track.file_key);
    if (!blob) continue;
    const file = `audio/${String(index + 1).padStart(2, "0")}-${slugName(track.name, "faixa")}.${extForMime(track.mime)}`;
    zipFiles[file] = new Uint8Array(await blob.arrayBuffer());
    packed.push({
      name: String(track.name || "Faixa").slice(0, 80),
      mime: track.mime || "audio/mpeg",
      durationSeconds: Math.max(0, Math.round(Number(track.duration_seconds) || 0)),
      file,
    });
  }

  if (!packed.length) {
    throw new Error("Não achei o áudio das faixas neste aparelho.");
  }

  const manifest = {
    kind: PLAYLIST_PACK_KIND,
    format: PLAYLIST_PACK_FORMAT,
    app: "FitCraft",
    exportedAt: new Date().toISOString(),
    playlist: {
      name: String(playlist.name || "Playlist").slice(0, 60),
      tracks: packed,
    },
  };
  zipFiles["manifest.json"] = strToU8(`${JSON.stringify(manifest)}\n`);

  const bytes = zipSync(zipFiles, { level: 0 });
  if (bytes.byteLength > MAX_ZIP_BYTES) {
    throw new Error("Este pacote passou de 95 MB. Tire algumas faixas e envie de novo.");
  }

  return {
    bytes,
    name: `FitCraft-${slugName(playlist.name)}${PLAYLIST_FILE_EXT}`,
    mime: "application/zip",
    trackCount: packed.length,
    playlistName: playlist.name,
  };
}

export function parsePlaylistArchive(bytes) {
  if (!looksLikeZip(bytes)) {
    throw new Error("Este arquivo não é o pacote da playlist.");
  }

  let unzipped;
  try {
    unzipped = unzipSync(bytes);
  } catch {
    throw new Error("Não consegui abrir o pacote da playlist.");
  }

  const manifestBytes = unzipped["manifest.json"];
  if (!manifestBytes) throw new Error("Falta o manifesto da playlist no arquivo.");

  let raw;
  try {
    raw = JSON.parse(strFromU8(manifestBytes));
  } catch {
    throw new Error("O manifesto da playlist está quebrado.");
  }
  if (!raw || raw.kind !== PLAYLIST_PACK_KIND) {
    throw new Error("Este arquivo não é uma playlist FitCraft.");
  }

  const name = String(raw.playlist?.name || "").trim().slice(0, 60);
  const items = Array.isArray(raw.playlist?.tracks) ? raw.playlist.tracks : [];
  if (!name) throw new Error("A playlist do arquivo não tem nome.");
  if (!items.length) throw new Error("A playlist do arquivo não tem faixas.");
  if (items.length > MAX_TRACKS) {
    throw new Error(`A playlist tem mais de ${MAX_TRACKS} faixas.`);
  }

  const tracks = items.map((item, index) => {
    const trackName = String(item?.name || "").trim().slice(0, 80);
    const file = String(item?.file || "").replace(/^\/+/, "");
    if (!trackName) throw new Error(`A faixa ${index + 1} veio sem nome.`);
    if (!file || !unzipped[file]) throw new Error(`A faixa “${trackName}” veio sem o áudio.`);
    const audio = unzipped[file];
    return {
      name: trackName,
      mime: item.mime || "audio/mpeg",
      durationSeconds: Math.max(0, Math.round(Number(item.durationSeconds ?? item.duration_seconds) || 0)),
      blob: new Blob([audio], { type: item.mime || "audio/mpeg" }),
    };
  });

  return {
    kind: PLAYLIST_PACK_KIND,
    format: PLAYLIST_PACK_FORMAT,
    playlist: { name, tracks },
  };
}

export async function applyPlaylistArchive(pack, playlistId = null) {
  const playlist = playlistId ? findPlaylist(playlistId) : createPlaylist(pack.playlist.name);
  if (!playlist) throw new Error("Playlist de destino não encontrada.");
  for (const track of pack.playlist.tracks) {
    await addPackedTrack(playlist.id, track);
  }
  return findPlaylist(playlist.id);
}

export async function readPlaylistArchiveFromFile(file) {
  if (!file) throw new Error("Escolha o pacote da playlist.");
  if (file.size > MAX_ZIP_BYTES) {
    throw new Error("Este pacote passou de 95 MB.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return parsePlaylistArchive(bytes);
}

export function pickPlaylistFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".fitcraft.zip,.zip,application/zip";
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

export { isAbortError, pickCycleFile, listPlaylists };
