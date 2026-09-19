import { all, deleteAudio, get, putAudio, run } from "../database/connection.js";
import { MAX_TRACKS } from "./Playlist.js";

const MAX_BYTES = 20 * 1024 * 1024;
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|flac|opus)$/i;

export function listTracks(playlistId) {
  return all(
    "SELECT * FROM tracks WHERE playlist_id = ? ORDER BY sort_order ASC, id ASC",
    [playlistId],
  );
}

export function findTrack(id) {
  return get("SELECT * FROM tracks WHERE id = ?", [id]);
}

function isAudioFile(file) {
  if (file.type.startsWith("audio/")) return true;
  return AUDIO_EXT.test(file.name);
}

function displayName(file) {
  return file.name.replace(AUDIO_EXT, "").replace(/[_]+/g, " ").trim() || "Faixa";
}

function readDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = new Audio();
    const done = (seconds) => {
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    probe.preload = "metadata";
    probe.onloadedmetadata = () => done(Math.max(0, Math.round(probe.duration) || 0));
    probe.onerror = () => done(0);
    probe.src = url;
  });
}

export async function importTracks(playlistId, fileList) {
  const current = listTracks(playlistId);
  const room = MAX_TRACKS - current.length;
  if (room <= 0) {
    throw new Error("Esta playlist já tem 15 faixas.");
  }

  const files = [...fileList].filter(isAudioFile).slice(0, room);
  if (!files.length) {
    throw new Error("Escolha arquivos de áudio que você já tem neste aparelho.");
  }

  let nextOrder = get(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM tracks WHERE playlist_id = ?",
    [playlistId],
  ).next;

  const skipped = [];

  for (const file of files) {
    if (file.size > MAX_BYTES) {
      skipped.push(file.name);
      continue;
    }

    const key = `audio-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await putAudio(key, file);
    const duration = await readDuration(file);
    run(
      `
        INSERT INTO tracks (playlist_id, name, mime, duration_seconds, file_key, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [playlistId, displayName(file), file.type || "audio/mpeg", duration, key, nextOrder],
    );
    nextOrder += 1;
  }

  if (skipped.length) {
    throw new Error(`Algumas faixas passam de 20 MB e ficaram de fora: ${skipped.join(", ")}`);
  }
}

export function addPlaceholderTracks(playlistId, items) {
  const current = listTracks(playlistId);
  const room = MAX_TRACKS - current.length;
  if (room <= 0) {
    throw new Error("Esta playlist já tem 15 faixas.");
  }

  let nextOrder = get(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM tracks WHERE playlist_id = ?",
    [playlistId],
  ).next;

  items.slice(0, room).forEach((item) => {
    const name = String(item.name || "Faixa").trim().slice(0, 80) || "Faixa";
    const key = `pending-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    run(
      `
        INSERT INTO tracks (playlist_id, name, mime, duration_seconds, file_key, sort_order)
        VALUES (?, ?, 'audio/mpeg', ?, ?, ?)
      `,
      [playlistId, name, Math.max(0, Math.round(Number(item.durationSeconds) || 0)), key, nextOrder],
    );
    nextOrder += 1;
  });
}

export function isPendingTrack(track) {
  return String(track?.file_key || "").startsWith("pending-");
}

export async function deleteTrack(id) {
  const track = findTrack(id);
  if (!track) return;
  run("DELETE FROM tracks WHERE id = ?", [id]);
  if (!isPendingTrack(track)) await deleteAudio(track.file_key);
}

export function moveTrack(id, direction) {
  const track = findTrack(id);
  if (!track) return;

  const neighbor = get(
    direction < 0
      ? `
        SELECT * FROM tracks
        WHERE playlist_id = ? AND sort_order < ?
        ORDER BY sort_order DESC LIMIT 1
      `
      : `
        SELECT * FROM tracks
        WHERE playlist_id = ? AND sort_order > ?
        ORDER BY sort_order ASC LIMIT 1
      `,
    [track.playlist_id, track.sort_order],
  );

  if (!neighbor) return;

  run("UPDATE tracks SET sort_order = ? WHERE id = ?", [neighbor.sort_order, track.id]);
  run("UPDATE tracks SET sort_order = ? WHERE id = ?", [track.sort_order, neighbor.id]);
}
