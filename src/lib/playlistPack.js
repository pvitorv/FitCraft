import { CYCLE_FILE_EXT, isAbortError, pickCycleFile } from "./cyclePack.js";
import { createPlaylist, findPlaylist, listPlaylists, MAX_TRACKS } from "../models/Playlist.js";
import { addPlaceholderTracks, listTracks } from "../models/Track.js";

export const PLAYLIST_PACK_KIND = "fitcraft.playlist";
export const PLAYLIST_PACK_FORMAT = 1;

export function buildPlaylistPack(playlistId) {
  const playlist = findPlaylist(playlistId);
  if (!playlist) throw new Error("Playlist não encontrada.");
  const tracks = listTracks(playlistId);
  if (!tracks.length) {
    throw new Error("Importe pelo menos uma faixa antes de enviar a playlist.");
  }

  return {
    kind: PLAYLIST_PACK_KIND,
    format: PLAYLIST_PACK_FORMAT,
    app: "FitCraft",
    exportedAt: new Date().toISOString(),
    playlist: {
      name: String(playlist.name || "Playlist").slice(0, 60),
      tracks: tracks.slice(0, MAX_TRACKS).map((track) => ({
        name: String(track.name || "Faixa").slice(0, 80),
        durationSeconds: Math.max(0, Math.round(Number(track.duration_seconds) || 0)),
      })),
    },
  };
}

export function parsePlaylistPack(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Este arquivo não é uma playlist FitCraft.");
  }
  if (!raw || raw.kind !== PLAYLIST_PACK_KIND) {
    throw new Error("Este arquivo não é uma playlist FitCraft.");
  }
  const name = String(raw.playlist?.name || "").trim().slice(0, 60);
  const tracks = Array.isArray(raw.playlist?.tracks) ? raw.playlist.tracks : [];
  if (!name) throw new Error("A playlist do arquivo não tem nome.");
  if (!tracks.length) throw new Error("A playlist do arquivo não tem faixas.");
  if (tracks.length > MAX_TRACKS) {
    throw new Error(`A playlist tem mais de ${MAX_TRACKS} faixas.`);
  }
  return {
    kind: PLAYLIST_PACK_KIND,
    format: PLAYLIST_PACK_FORMAT,
    playlist: {
      name,
      tracks: tracks.map((item, index) => {
        const trackName = String(item?.name || "").trim().slice(0, 80);
        if (!trackName) throw new Error(`A faixa ${index + 1} veio sem nome.`);
        return {
          name: trackName,
          durationSeconds: Math.max(0, Math.round(Number(item.durationSeconds ?? item.duration_seconds) || 0)),
        };
      }),
    },
  };
}

export function fileNameForPlaylistPack(pack) {
  const slug =
    String(pack?.playlist?.name || "playlist")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "playlist";
  return `FitCraft-${slug}${CYCLE_FILE_EXT}`;
}

export function applyPlaylistPack(pack, playlistId = null) {
  const playlist = playlistId ? findPlaylist(playlistId) : createPlaylist(pack.playlist.name);
  if (!playlist) throw new Error("Playlist de destino não encontrada.");
  addPlaceholderTracks(playlist.id, pack.playlist.tracks);
  return findPlaylist(playlist.id);
}

export async function readPlaylistPackFromFile(file) {
  if (!file) throw new Error("Escolha um arquivo .fitcraft.");
  if (file.size > 200_000) throw new Error("Arquivo grande demais.");
  return parsePlaylistPack(await file.text());
}

export { isAbortError, pickCycleFile, listPlaylists };
