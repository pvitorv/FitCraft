import { all, get, run } from "../database/connection.js";
import { getSetting, setSetting } from "./Setting.js";

export const MAX_TRACKS = 15;

export function listPlaylists() {
  return all(
    `
      SELECT
        playlists.*,
        (SELECT COUNT(*) FROM tracks WHERE tracks.playlist_id = playlists.id) AS track_count
      FROM playlists
      ORDER BY playlists.id ASC
    `,
  );
}

export function findPlaylist(id) {
  return get(
    `
      SELECT
        playlists.*,
        (SELECT COUNT(*) FROM tracks WHERE tracks.playlist_id = playlists.id) AS track_count
      FROM playlists
      WHERE id = ?
    `,
    [id],
  );
}

export function getActivePlaylistId() {
  const value = getSetting("active_playlist_id");
  if (value) return Number(value);
  const first = get("SELECT id FROM playlists ORDER BY id ASC LIMIT 1");
  return first ? first.id : null;
}

export function setActivePlaylistId(id) {
  setSetting("active_playlist_id", id);
}

export function getActivePlaylist() {
  const id = getActivePlaylistId();
  return id ? findPlaylist(id) : null;
}

export function isMusicEnabled() {
  return getSetting("music_enabled", "1") === "1";
}

export function setMusicEnabled(on) {
  setSetting("music_enabled", on ? "1" : "0");
}
