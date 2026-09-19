import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import {
  deleteDurableAudio,
  durableAudioExists,
  durableBlobExists,
  readDurableAudio,
  readDurableBlob,
  readDurableSqlite,
  writeDurableAudio,
  writeDurableBlob,
  writeDurableSqlite,
} from "./durable.js";
import { migrate } from "./migrate.js";

const IDB_NAME = "fitcraft";
const STORE = "kv";
const DB_KEY = "sqlite";
const AUDIO_PREFIX = "audio:";
const BLOB_PREFIX = "blob:";

let database = null;
let persistTimer = null;
let persistChain = Promise.resolve();
let idbPromise = null;

function openIdb() {
  if (idbPromise) return idbPromise;

  idbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => {
      request.result.onclose = () => {
        idbPromise = null;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      idbPromise = null;
      reject(request.error);
    };
  });

  return idbPromise;
}

async function readBytes() {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(DB_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function writeBytes(bytes) {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(bytes, DB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut(key, value) {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key) {
  const idb = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function openSqlite(SQL, bytes) {
  try {
    const instance = bytes ? new SQL.Database(new Uint8Array(bytes)) : new SQL.Database();
    instance.run("PRAGMA foreign_keys = ON;");
    return instance;
  } catch (error) {
    console.error("Dump SQLite inválido", error);
    return null;
  }
}

function userDataScore(instance) {
  if (!instance) return 0;
  const queries = [
    "SELECT COUNT(*) FROM plans",
    "SELECT COUNT(*) FROM cycles",
    "SELECT COUNT(*) FROM tracks",
    "SELECT COUNT(*) FROM sessions",
    "SELECT COUNT(*) FROM expenses",
    "SELECT COUNT(*) FROM meals",
    "SELECT COUNT(*) FROM body_logs",
  ];
  let score = 0;
  for (const sql of queries) {
    try {
      const result = instance.exec(sql);
      score += Number(result[0]?.values?.[0]?.[0] || 0);
    } catch {
      // dump antigo ainda não tem a tabela
    }
  }
  return score;
}

async function syncMedia() {
  try {
    const tracks = all("SELECT file_key, mime FROM tracks");
    for (const track of tracks) {
      if (!track.file_key) continue;
      const idbBlob = await idbGet(AUDIO_PREFIX + track.file_key);
      if (idbBlob) {
        if (!(await durableAudioExists(track.file_key))) {
          await writeDurableAudio(track.file_key, idbBlob);
        }
        continue;
      }
      const diskBlob = await readDurableAudio(track.file_key, track.mime);
      if (diskBlob) await idbPut(AUDIO_PREFIX + track.file_key, diskBlob);
    }

    const idbPhoto = await idbGet(`${BLOB_PREFIX}profile-photo`);
    if (idbPhoto) {
      if (!(await durableBlobExists("profile-photo"))) {
        await writeDurableBlob("profile-photo", idbPhoto);
      }
      return;
    }
    const diskPhoto = await readDurableBlob("profile-photo");
    if (diskPhoto) await idbPut(`${BLOB_PREFIX}profile-photo`, diskPhoto);
  } catch (error) {
    console.error("Falha ao sincronizar áudio e foto no aparelho", error);
  }
}

export async function bootDb() {
  if (database) {
    migrate(database);
    schedulePersist();
    return database;
  }

  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const idbBytes = await readBytes();
  const diskBytes = await readDurableSqlite();
  const idbDb = openSqlite(SQL, idbBytes);
  const diskDb = diskBytes ? openSqlite(SQL, diskBytes) : null;
  const idbScore = userDataScore(idbDb);
  const diskScore = userDataScore(diskDb);

  if (diskDb && diskScore > idbScore) {
    idbDb?.close();
    database = diskDb;
  } else {
    diskDb?.close();
    database = idbDb || openSqlite(SQL, null);
  }

  migrate(database);
  await persistNow();
  await syncMedia();
  return database;
}

export function db() {
  if (!database) {
    throw new Error("Banco ainda não foi aberto.");
  }
  return database;
}

export function persist() {
  persistChain = persistChain
    .catch(() => {})
    .then(async () => {
      if (!database) return;
      const bytes = database.export();
      await writeBytes(bytes);
      try {
        await writeDurableSqlite(bytes);
      } catch (error) {
        console.error("Falha ao copiar o banco no aparelho", error);
      }
    });
  return persistChain;
}

export async function persistNow() {
  clearTimeout(persistTimer);
  persistTimer = null;
  await persist();
}

export function schedulePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persist().catch((error) => {
      console.error("Falha ao gravar o SQLite", error);
    });
  }, 40);
}

export function run(sql, params = []) {
  db().run(sql, params);
  schedulePersist();
}

export function all(sql, params = []) {
  const statement = db().prepare(sql);
  statement.bind(params);
  const rows = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }
  statement.free();
  return rows;
}

export function get(sql, params = []) {
  return all(sql, params)[0] ?? null;
}

export function lastId() {
  return get("SELECT last_insert_rowid() AS id").id;
}

export async function putAudio(key, blob) {
  await idbPut(AUDIO_PREFIX + key, blob);
  try {
    await writeDurableAudio(key, blob);
  } catch (error) {
    console.error("Falha ao copiar o áudio no aparelho", error);
  }
}

export async function getAudio(key) {
  const fromIdb = await idbGet(AUDIO_PREFIX + key);
  if (fromIdb) return fromIdb;
  const fromDisk = await readDurableAudio(key);
  if (fromDisk) await idbPut(AUDIO_PREFIX + key, fromDisk);
  return fromDisk;
}

export async function putBlob(key, blob) {
  await idbPut(BLOB_PREFIX + key, blob);
  try {
    await writeDurableBlob(key, blob);
  } catch (error) {
    console.error("Falha ao copiar o arquivo no aparelho", error);
  }
}

export async function getBlob(key) {
  const fromIdb = await idbGet(BLOB_PREFIX + key);
  if (fromIdb) return fromIdb;
  const fromDisk = await readDurableBlob(key);
  if (fromDisk) await idbPut(BLOB_PREFIX + key, fromDisk);
  return fromDisk;
}

export async function deleteAudio(key) {
  await idbDelete(AUDIO_PREFIX + key);
  await deleteDurableAudio(key);
}
