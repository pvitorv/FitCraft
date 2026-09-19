import { escapeHtml } from "../lib/html.js";
import { icons } from "../lib/icons.js";
import { formatClock } from "../lib/time.js";
import {
  findPlaylist,
  getActivePlaylistId,
  isMusicEnabled,
  listPlaylists,
  MAX_TRACKS,
} from "../models/Playlist.js";
import { deleteTrack, importTracks, listTracks, moveTrack } from "../models/Track.js";
import { go } from "../routes.js";
import { applyPlaylistArchive, isAbortError, pickPlaylistFile, readPlaylistArchiveFromFile } from "../lib/playlistPack.js";
import { shareOrSavePlaylist } from "../services/shareCycle.js";
import {
  nextTrack,
  pauseMusic,
  playTrack,
  prevTrack,
  setEnabled,
  snapshot,
  subscribe,
  toggleMusic,
  usePlaylist,
} from "../services/musicPlayer.js";

let unsubscribe = null;

function playerBar() {
  const snap = snapshot();
  const title = snap.track?.name ?? "Nenhuma faixa";
  const album = snap.playlist?.name ?? "Summer Eletrohits";
  return `
    <article class="player-bar">
      <div>
        <small>${snap.enabled ? "Playlist ligada" : "Playlist desligada"}</small>
        <strong>${escapeHtml(title)}</strong>
        <p class="muted">${escapeHtml(album)}${snap.total ? ` · ${snap.index + 1}/${snap.total}` : ""}</p>
      </div>
      <div class="player-actions">
        <button type="button" class="icon-btn player-icon" data-music-prev aria-label="Anterior">${icons.back}</button>
        <button type="button" class="btn btn-primary" data-music-toggle>
          ${snap.playing ? `${icons.pause} Pausar` : `${icons.play} Tocar`}
        </button>
        <button type="button" class="icon-btn player-icon" data-music-next aria-label="Próxima">${icons.next}</button>
      </div>
    </article>
  `;
}

function bindPlayer(root) {
  unsubscribe?.();
  bindPlayerButtons(root);
  unsubscribe = subscribe((snap) => {
    const bar = root.querySelector(".player-bar");
    if (!bar) {
      unsubscribe?.();
      return;
    }
    const next = document.createElement("div");
    next.innerHTML = playerBar();
    bar.replaceWith(next.firstElementChild);
    bindPlayerButtons(root);
    const toggle = root.querySelector("[data-music-enabled]");
    if (toggle) toggle.classList.toggle("is-on", snap.enabled);
  });
}

function bindPlayerButtons(root) {
  root.querySelector("[data-music-toggle]")?.addEventListener("click", () => {
    toggleMusic();
  });
  root.querySelector("[data-music-prev]")?.addEventListener("click", () => {
    prevTrack();
  });
  root.querySelector("[data-music-next]")?.addEventListener("click", () => {
    nextTrack();
  });
}

export async function playlistScreen(params) {
  if (params.id) return playlistDetail(params.id);
  return playlistHome();
}

async function playlistHome() {
  const playlists = listPlaylists();
  const activeId = getActivePlaylistId();
  const enabled = isMusicEnabled();

  return {
    html: `
      <article class="hero">
        <div class="kicker"><span class="dot"></span> Playlist local</div>
        <h2>Summer Eletrohits no aparelho.</h2>
        <p>Importe as músicas que você já tem. Enviar empacota o áudio num arquivo e abre o WhatsApp, Telegram, e-mail ou Drive. Quem aperta enviar é você.</p>
        <div class="cta-row">
          <button class="btn btn-ghost" type="button" id="import-playlist">${icons.share} Receber playlist</button>
        </div>
        <div class="cta-row">
          <button type="button" class="row music-switch" data-music-enabled-wrap>
            <div>
              <strong>Tocar playlist</strong>
              <p class="muted">Liga e desliga sem mexer no timer.</p>
            </div>
            <div class="switch ${enabled ? "is-on" : ""}" data-music-enabled aria-hidden="true"></div>
          </button>
        </div>
      </article>
      ${playerBar()}
      <div class="list" style="margin-top:16px">
        ${playlists
          .map(
            (playlist) => `
              <article class="playlist-card ${playlist.id === activeId ? "is-active" : ""}">
                <button type="button" class="playlist-open" data-go="/playlist/${playlist.id}">
                  <small>${playlist.id === activeId ? "Em uso" : "Coleção"}</small>
                  <strong>${escapeHtml(playlist.name)}</strong>
                  <p class="muted">${playlist.track_count}/${MAX_TRACKS} faixas</p>
                </button>
                <button type="button" class="btn ${playlist.id === activeId ? "btn-primary" : "btn-ghost"}" data-use="${playlist.id}">
                  ${playlist.id === activeId ? `${icons.check} Em uso` : "Usar esta"}
                </button>
              </article>
            `,
          )
          .join("")}
      </div>
    `,
    bind(root) {
      bindPlayer(root);
      root.querySelector("[data-music-enabled-wrap]")?.addEventListener("click", () => {
        setEnabled(!isMusicEnabled());
      });
      root.querySelectorAll("[data-use]").forEach((button) => {
        button.addEventListener("click", () => {
          usePlaylist(Number(button.dataset.use));
          go("/playlist");
        });
      });
      root.querySelector("#import-playlist")?.addEventListener("click", async () => {
        try {
          const file = await pickPlaylistFile();
          const pack = await readPlaylistArchiveFromFile(file);
          const created = await applyPlaylistArchive(pack);
          alert(`Playlist “${created.name}” chegou com o áudio.`);
          go(`/playlist/${created.id}`);
        } catch (error) {
          if (isAbortError(error)) return;
          alert(error.message);
        }
      });
    },
  };
}

async function playlistDetail(id) {
  const playlist = findPlaylist(id);
  if (!playlist) {
    return {
      html: `
        <div class="empty">
          <h3>Playlist não encontrada</h3>
          <button class="btn btn-ghost" data-go="/playlist">Voltar</button>
        </div>
      `,
    };
  }

  const tracks = listTracks(playlist.id);
  const active = getActivePlaylistId() === playlist.id;
  const full = tracks.length >= MAX_TRACKS;

  return {
    html: `
      <button class="back-link" data-go="/playlist">${icons.back} Playlists</button>
      <article class="hero">
        <div class="kicker"><span class="dot"></span> ${tracks.length}/${MAX_TRACKS}</div>
        <h2>${escapeHtml(playlist.name)}</h2>
        <p>Importe MP3, M4A, AAC, WAV ou OGG que você já possui. O timer tem pause próprio; este aqui só mexe na música.</p>
        <div class="cta-row">
          <button class="btn btn-primary" type="button" id="import-tracks" ${full ? "disabled" : ""}>
            ${icons.plus} Importar faixas
          </button>
          <button class="btn btn-ghost" type="button" data-share-playlist ${tracks.length ? "" : "disabled"}>
            ${icons.share} Enviar pelo WhatsApp
          </button>
          <button class="btn ${active ? "btn-primary" : "btn-ghost"}" type="button" data-use="${playlist.id}">
            ${active ? `${icons.check} Em uso` : "Usar esta"}
          </button>
        </div>
        <input id="track-files" type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac" multiple hidden />
      </article>
      ${playerBar()}
      ${
        tracks.length
          ? `<ol class="track-list">
              ${tracks
                .map(
                  (track, index) => `
                    <li class="track-card ${snapshot().track?.id === track.id ? "is-current" : ""}" data-track="${track.id}">
                      <button type="button" class="track-play" data-play="${track.id}">
                        <span class="cycle-index">${String(index + 1).padStart(2, "0")}</span>
                        <span>
                          <strong>${escapeHtml(track.name)}</strong>
                          <em>${
                            track.duration_seconds ? formatClock(track.duration_seconds) : "áudio"
                          }${String(track.file_key || "").startsWith("pending-") ? " · falta importar o arquivo" : ""}</em>
                        </span>
                      </button>
                      <div class="track-tools">
                        <button type="button" class="btn btn-ghost" data-move="${track.id}" data-dir="-1">↑</button>
                        <button type="button" class="btn btn-ghost" data-move="${track.id}" data-dir="1">↓</button>
                        <button type="button" class="btn btn-danger" data-delete="${track.id}">${icons.trash}</button>
                      </div>
                    </li>
                  `,
                )
                .join("")}
            </ol>`
          : `<div class="empty">
              <div class="empty-icon">${icons.music}</div>
              <h3>Playlist vazia</h3>
              <p>Toque em Importar e escolha as músicas que já estão no celular ou no PC.</p>
            </div>`
      }
    `,
    bind(root) {
      bindPlayer(root);
      const picker = root.querySelector("#track-files");
      root.querySelector("#import-tracks")?.addEventListener("click", () => picker?.click());
      picker?.addEventListener("change", async () => {
        if (!picker.files?.length) return;
        try {
          await importTracks(playlist.id, picker.files);
          if (getActivePlaylistId() === playlist.id && !snapshot().track) {
            await usePlaylist(playlist.id);
          }
        } catch (error) {
          alert(error.message);
        }
        picker.value = "";
        go(`/playlist/${playlist.id}`);
      });

      root.querySelector("[data-use]")?.addEventListener("click", () => {
        usePlaylist(playlist.id);
        go(`/playlist/${playlist.id}`);
      });

      root.querySelector("[data-share-playlist]")?.addEventListener("click", async () => {
        try {
          const result = await shareOrSavePlaylist(playlist.id);
          if (result === "downloaded") {
            alert("Arquivo salvo no PC. No celular o Enviar abre o WhatsApp com o áudio da playlist.");
          }
        } catch (error) {
          if (isAbortError(error)) return;
          alert(error.message);
        }
      });

      root.querySelectorAll("[data-play]").forEach((button) => {
        button.addEventListener("click", async () => {
          if (getActivePlaylistId() !== playlist.id) await usePlaylist(playlist.id);
          await playTrack(Number(button.dataset.play));
        });
      });

      root.querySelectorAll("[data-delete]").forEach((button) => {
        button.addEventListener("click", async () => {
          const id = Number(button.dataset.delete);
          const wasCurrent = snapshot().track?.id === id;
          await deleteTrack(id);
          if (wasCurrent) {
            pauseMusic();
            await usePlaylist(playlist.id);
          }
          go(`/playlist/${playlist.id}`);
        });
      });

      root.querySelectorAll("[data-move]").forEach((button) => {
        button.addEventListener("click", () => {
          moveTrack(Number(button.dataset.move), Number(button.dataset.dir));
          go(`/playlist/${playlist.id}`);
        });
      });
    },
  };
}
