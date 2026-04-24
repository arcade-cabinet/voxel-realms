import { APP_KV_VALUE_MAX_BYTES, getDatabase, withDatabaseWriteLock } from "./database";
import { initializeRealmPreferences } from "./preferences";

let storageInitFailureLogged = false;

const RUN_NAMESPACE = "realm-runs";
const SETTINGS_NAMESPACE = "settings";

export interface PersistedRealmRun {
  id: string;
  seed: number;
  realmIndex: number;
  archetypeId: string;
  extractionState: "ascending" | "extracted" | "collapsed";
  scannedAnomalyIds: string[];
  updatedAt: string;
}

let initializationPromise: Promise<void> | null = null;
const testStore = new Map<string, string>();

export async function initializePersistence(): Promise<void> {
  if (!initializationPromise) {
    // Fail-soft: catch init errors so a single flaky SQLite /
    // preferences failure doesn't make every subsequent read/write
    // reject. getItem / setItem already tolerate null/throw downstream.
    initializationPromise = (
      isBrowserTestEnv()
        ? initializeRealmPreferences()
        : Promise.all([getDatabase(), initializeRealmPreferences()]).then(() => undefined)
    ).catch((error) => {
      if (!storageInitFailureLogged) {
        console.warn("[persistence] initialization failed, persistence is degraded", error);
        storageInitFailureLogged = true;
      }
    });
  }

  return initializationPromise;
}

export async function loadCurrentRealmRun(): Promise<PersistedRealmRun | null> {
  await initializePersistence();
  return getItem<PersistedRealmRun>(RUN_NAMESPACE, "current");
}

export async function saveCurrentRealmRun(run: PersistedRealmRun | null): Promise<void> {
  await initializePersistence();

  if (run === null) {
    await deleteItem(RUN_NAMESPACE, "current");
    return;
  }

  await setItem(RUN_NAMESPACE, "current", run);
}

export async function loadPersistedSetting<T>(key: string): Promise<T | null> {
  await initializePersistence();
  return getItem<T>(SETTINGS_NAMESPACE, key);
}

export async function savePersistedSetting<T>(key: string, value: T): Promise<void> {
  await initializePersistence();
  await setItem(SETTINGS_NAMESPACE, key, value);
}

export async function resetPersistenceForTests(): Promise<void> {
  testStore.clear();
  initializationPromise = null;

  if (isBrowserTestEnv()) {
    return;
  }

  await withDatabaseWriteLock(async (db) => {
    await db.execute("DELETE FROM app_kv;");
  });
}

async function getItem<T>(namespace: string, key: string): Promise<T | null> {
  if (isBrowserTestEnv()) {
    const value = testStore.get(scopedKey(namespace, key));
    return value ? safeParse<T>(value, scopedKey(namespace, key)) : null;
  }

  try {
    const db = await getDatabase();
    const result = await db.query(
      "SELECT value FROM app_kv WHERE namespace = ? AND item_key = ? LIMIT 1",
      [namespace, key]
    );
    const row = result.values?.[0];
    return row ? safeParse<T>(String(row.value), `${namespace}::${key}`) : null;
  } catch (error) {
    if (!storageInitFailureLogged) {
      console.warn("[persistence] database unavailable, returning null for reads", error);
      storageInitFailureLogged = true;
    }
    return null;
  }
}

async function setItem<T>(namespace: string, key: string, value: T): Promise<void> {
  const serialized = JSON.stringify(value);
  if (serialized.length > APP_KV_VALUE_MAX_BYTES) {
    console.warn(
      `[persistence] rejected oversized value for ${namespace}::${key} (${serialized.length} > ${APP_KV_VALUE_MAX_BYTES})`
    );
    return;
  }

  if (isBrowserTestEnv()) {
    testStore.set(scopedKey(namespace, key), serialized);
    return;
  }

  const now = new Date().toISOString();
  try {
    await withDatabaseWriteLock(async (db) => {
      await db.run(
        `INSERT INTO app_kv(namespace, item_key, value, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(namespace, item_key)
          DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [namespace, key, serialized, now]
      );
    });
  } catch (error) {
    if (!storageInitFailureLogged) {
      console.warn("[persistence] database unavailable, dropping write", error);
      storageInitFailureLogged = true;
    }
  }
}

async function deleteItem(namespace: string, key: string): Promise<void> {
  if (isBrowserTestEnv()) {
    testStore.delete(scopedKey(namespace, key));
    return;
  }

  try {
    await withDatabaseWriteLock(async (db) => {
      await db.run("DELETE FROM app_kv WHERE namespace = ? AND item_key = ?", [namespace, key]);
    });
  } catch (error) {
    if (!storageInitFailureLogged) {
      console.warn("[persistence] database unavailable, dropping delete", error);
      storageInitFailureLogged = true;
    }
  }
}

function scopedKey(namespace: string, key: string): string {
  return `${namespace}::${key}`;
}

function safeParse<T>(raw: string, source: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[persistence] discarding corrupted value from ${source}`, error);
    return null;
  }
}

function isBrowserTestEnv(): boolean {
  return typeof window !== "undefined" && window.__VOXEL_REALMS_TEST__ === true;
}
