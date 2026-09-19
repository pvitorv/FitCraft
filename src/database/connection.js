import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { migrate } from "./migrate.js";

const IDB_NAME = "fitcraft";
const STORE = "kv";
const DB_KEY = "sqlite";

let database = null;
let persistTimer = null;
let persistChain = Promise.resolve();
let idbPromise = null;

function openIdb() {
  if (idbPromise) return idbPromise;

  idbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
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

export async function bootDb() {
  if (database) {
    migrate(database);
    schedulePersist();
    return database;
  }

  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const saved = await readBytes();
  database = saved ? new SQL.Database(new Uint8Array(saved)) : new SQL.Database();
  database.run("PRAGMA foreign_keys = ON;");
  migrate(database);
  await persistNow();
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
      await writeBytes(database.export());
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
