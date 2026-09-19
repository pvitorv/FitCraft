import { getAudio } from "../database/connection.js";
import {
  getActivePlaylist,
  getActivePlaylistId,
  isMusicEnabled,
  setActivePlaylistId,
  setMusicEnabled,
} from "../models/Playlist.js";
import { findTrack, listTracks } from "../models/Track.js";

const audio = new Audio();
audio.preload = "auto";

let objectUrl = null;
let trackId = null;
let index = 0;
let userPaused = true;
const listeners = new Set();

function emit() {
  const snap = snapshot();
  listeners.forEach((fn) => fn(snap));
}

function revoke() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

function tracksOfActive() {
  const id = getActivePlaylistId();
  return id ? listTracks(id) : [];
}

async function loadIndex(nextIndex, { autoplay = false, hops = 0 } = {}) {
  const tracks = tracksOfActive();
  if (!tracks.length) {
    audio.pause();
    audio.removeAttribute("src");
    revoke();
    trackId = null;
    index = 0;
    emit();
    return;
  }

  index = ((nextIndex % tracks.length) + tracks.length) % tracks.length;
  const track = tracks[index];
  const blob = String(track.file_key || "").startsWith("pending-")
    ? null
    : await getAudio(track.file_key);
  if (!blob) {
    if (hops + 1 < tracks.length) {
      return loadIndex(index + 1, { autoplay, hops: hops + 1 });
    }
    emit();
    return;
  }

  revoke();
  objectUrl = URL.createObjectURL(blob);
  trackId = track.id;
  audio.src = objectUrl;
  audio.load();

  if (autoplay && isMusicEnabled()) {
    userPaused = false;
    try {
      await audio.play();
    } catch {
      userPaused = true;
    }
  }
  emit();
}

audio.addEventListener("ended", () => {
  if (!isMusicEnabled() || userPaused) return;
  const tracks = tracksOfActive();
  if (!tracks.length) return;
  loadIndex(index + 1, { autoplay: true });
});

audio.addEventListener("play", emit);
audio.addEventListener("pause", emit);

export function snapshot() {
  const playlist = getActivePlaylist();
  const tracks = playlist ? listTracks(playlist.id) : [];
  const track = trackId ? findTrack(trackId) : tracks[index] ?? null;
  return {
    enabled: isMusicEnabled(),
    playing: !audio.paused && !audio.ended && Boolean(audio.src),
    paused: userPaused || audio.paused,
    hasTracks: tracks.length > 0,
    playlist,
    track,
    index,
    total: tracks.length,
  };
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(snapshot());
  return () => listeners.delete(fn);
}

export async function usePlaylist(id) {
  const same = getActivePlaylistId() === id;
  setActivePlaylistId(id);
  if (!same || !audio.src) {
    await loadIndex(0, { autoplay: isMusicEnabled() && !userPaused });
  } else {
    emit();
  }
}

export async function play() {
  if (!isMusicEnabled()) setMusicEnabled(true);
  const tracks = tracksOfActive();
  if (!tracks.length) return;
  if (!audio.src || !tracks.some((item) => item.id === trackId)) {
    await loadIndex(index, { autoplay: true });
    return;
  }
  userPaused = false;
  try {
    await audio.play();
  } catch {
    userPaused = true;
  }
  emit();
}

export function pauseMusic() {
  userPaused = true;
  audio.pause();
  emit();
}

export async function toggleMusic() {
  if (!isMusicEnabled()) {
    setMusicEnabled(true);
    await play();
    return;
  }
  if (audio.paused) await play();
  else pauseMusic();
}

export function setEnabled(on) {
  setMusicEnabled(on);
  if (!on) pauseMusic();
  else emit();
}

export async function nextTrack() {
  await loadIndex(index + 1, { autoplay: isMusicEnabled() && !userPaused });
}

export async function prevTrack() {
  await loadIndex(index - 1, { autoplay: isMusicEnabled() && !userPaused });
}

export async function playTrack(id) {
  const tracks = tracksOfActive();
  const next = tracks.findIndex((item) => item.id === id);
  if (next < 0) return;
  setMusicEnabled(true);
  await loadIndex(next, { autoplay: true });
}

export function musicButtonLabel() {
  const snap = snapshot();
  if (!snap.hasTracks) return "Playlists";
  if (!snap.enabled) return "Ligar música";
  if (snap.playing) return "Pausar música";
  return "Tocar música";
}
