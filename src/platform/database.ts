import { Capacitor } from "@capacitor/core";
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from "@capacitor-community/sqlite";
import { defineCustomElements as defineJeepSqlite } from "jeep-sqlite/loader";

const DB_NAME = "voxel_realms";
const DB_VERSION = 1;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS app_kv (
  namespace TEXT NOT NULL,
  item_key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (namespace, item_key)
);
`;

const sqlite = new SQLiteConnection(CapacitorSQLite);
let connectionPromise: Promise<SQLiteDBConnection> | null = null;
let webReadyPromise: Promise<void> | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

export async function getDatabase(): Promise<SQLiteDBConnection> {
  if (!connectionPromise) {
    connectionPromise = initializeDatabase().catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  return connectionPromise;
}

export async function withDatabaseWriteLock<T>(
  action: (db: SQLiteDBConnection) => Promise<T>
): Promise<T> {
  const prior = writeQueue.catch(() => undefined);
  const next = prior.then(async () => {
    const db = await getDatabase();
    const result = await action(db);

    if (Capacitor.getPlatform() === "web") {
      await flushWebStore();
    }

    return result;
  });

  writeQueue = next.catch(() => undefined);
  return next;
}

export async function closeDatabase(): Promise<void> {
  const existing = await sqlite.isConnection(DB_NAME, false);
  if (existing.result) {
    await sqlite.closeConnection(DB_NAME, false);
  }
  connectionPromise = null;
}

async function initializeDatabase(): Promise<SQLiteDBConnection> {
  await prepareWebStore();
  await sqlite.checkConnectionsConsistency();
  const existing = await sqlite.isConnection(DB_NAME, false);
  const db = existing.result
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, "no-encryption", DB_VERSION, false);

  await db.open();
  await db.execute(SCHEMA);
  return db;
}

async function prepareWebStore(): Promise<void> {
  if (Capacitor.getPlatform() !== "web") {
    return;
  }

  if (webReadyPromise) {
    return webReadyPromise;
  }

  webReadyPromise = (async () => {
    defineJeepSqlite(window);
    await customElements.whenDefined("jeep-sqlite");

    if (!document.querySelector("jeep-sqlite")) {
      const element = document.createElement("jeep-sqlite");
      element.setAttribute("autosave", "true");
      element.setAttribute("wasmpath", `${import.meta.env.BASE_URL}assets`);
      document.body.appendChild(element);
    }

    await sqlite.initWebStore();
  })();

  return webReadyPromise;
}

async function flushWebStore(database = DB_NAME): Promise<void> {
  await sqlite.saveToStore(database);
}
