import { Preferences } from "@capacitor/preferences";

const REALM_PREFERENCES_KEY = "voxel-realms.preferences.v1";

export interface RealmExpeditionRecord {
  score: number;
  totalSignals: number;
  extractedCount: number;
  collapsedCount: number;
  completedCount: number;
  bestStabilityRemaining: number;
  rank: string;
  rankLabel: string;
  recordedAt: number;
}

export interface RealmPlayerPreferences {
  audioEnabled: boolean;
  motionReduced: boolean;
  hapticsEnabled: boolean;
  onboardingSeen: boolean;
  telemetryOptIn: boolean;
  bestExpedition: RealmExpeditionRecord | null;
  lastExpedition: RealmExpeditionRecord | null;
}

export const DEFAULT_REALM_PREFERENCES: RealmPlayerPreferences = {
  audioEnabled: true,
  motionReduced: false,
  hapticsEnabled: true,
  onboardingSeen: false,
  telemetryOptIn: false,
  bestExpedition: null,
  lastExpedition: null,
};

const testPreferences = new Map<string, string>();

export async function initializeRealmPreferences(): Promise<void> {
  const raw = await getPreferenceValue(REALM_PREFERENCES_KEY);
  if (raw === null) {
    await saveRealmPreferences(DEFAULT_REALM_PREFERENCES);
  }
}

export async function loadRealmPreferences(): Promise<RealmPlayerPreferences> {
  const raw = await getPreferenceValue(REALM_PREFERENCES_KEY);
  return normalizeRealmPreferences(safeParse(raw));
}

const PREFERENCES_MAX_BYTES = 64 * 1024;

export async function saveRealmPreferences(
  preferences: Partial<RealmPlayerPreferences>
): Promise<RealmPlayerPreferences> {
  const next = normalizeRealmPreferences(preferences);
  const serialized = JSON.stringify(next);
  if (serialized.length > PREFERENCES_MAX_BYTES) {
    console.warn(
      `[preferences] rejected oversized payload (${serialized.length} > ${PREFERENCES_MAX_BYTES}), falling back to defaults`
    );
    const safe = { ...DEFAULT_REALM_PREFERENCES };
    await setPreferenceValue(REALM_PREFERENCES_KEY, JSON.stringify(safe));
    return safe;
  }
  await setPreferenceValue(REALM_PREFERENCES_KEY, serialized);
  return next;
}

export async function updateRealmPreferences(
  preferences: Partial<RealmPlayerPreferences>
): Promise<RealmPlayerPreferences> {
  const current = await loadRealmPreferences();
  return saveRealmPreferences({ ...current, ...preferences });
}

export async function recordExpeditionScore(
  record: Omit<RealmExpeditionRecord, "recordedAt">
): Promise<RealmPlayerPreferences> {
  const current = await loadRealmPreferences();
  const stamped: RealmExpeditionRecord = { ...record, recordedAt: Date.now() };
  const best =
    current.bestExpedition && current.bestExpedition.score >= record.score
      ? current.bestExpedition
      : stamped;
  return saveRealmPreferences({
    ...current,
    lastExpedition: stamped,
    bestExpedition: best,
  });
}

export async function resetRealmPreferencesForTests(): Promise<void> {
  if (isBrowserTestEnv()) {
    testPreferences.clear();
    return;
  }

  await Preferences.remove({ key: REALM_PREFERENCES_KEY });
}

const RANK_MAX_LENGTH = 32;
const RANK_LABEL_MAX_LENGTH = 64;

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function coerceFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function coerceCappedString(value: unknown, fallback: string, max: number): string {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.length > max ? value.slice(0, max) : value;
}

function coerceExpeditionRecord(
  value: unknown
): RealmExpeditionRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const r = value as Record<string, unknown>;
  return {
    score: coerceFiniteNumber(r.score, 0),
    totalSignals: coerceFiniteNumber(r.totalSignals, 0),
    extractedCount: coerceFiniteNumber(r.extractedCount, 0),
    collapsedCount: coerceFiniteNumber(r.collapsedCount, 0),
    completedCount: coerceFiniteNumber(r.completedCount, 0),
    bestStabilityRemaining: coerceFiniteNumber(r.bestStabilityRemaining, 0),
    rank: coerceCappedString(r.rank, "", RANK_MAX_LENGTH),
    rankLabel: coerceCappedString(r.rankLabel, "", RANK_LABEL_MAX_LENGTH),
    recordedAt: coerceFiniteNumber(r.recordedAt, 0),
  };
}

function normalizeRealmPreferences(
  preferences: Partial<RealmPlayerPreferences> | null
): RealmPlayerPreferences {
  const source = (preferences ?? {}) as Record<string, unknown>;
  return {
    audioEnabled: coerceBoolean(source.audioEnabled, DEFAULT_REALM_PREFERENCES.audioEnabled),
    motionReduced: coerceBoolean(source.motionReduced, DEFAULT_REALM_PREFERENCES.motionReduced),
    hapticsEnabled: coerceBoolean(source.hapticsEnabled, DEFAULT_REALM_PREFERENCES.hapticsEnabled),
    onboardingSeen: coerceBoolean(source.onboardingSeen, DEFAULT_REALM_PREFERENCES.onboardingSeen),
    telemetryOptIn: coerceBoolean(source.telemetryOptIn, DEFAULT_REALM_PREFERENCES.telemetryOptIn),
    bestExpedition: coerceExpeditionRecord(source.bestExpedition),
    lastExpedition: coerceExpeditionRecord(source.lastExpedition),
  };
}

function safeParse(raw: string | null): Partial<RealmPlayerPreferences> | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Partial<RealmPlayerPreferences>;
  } catch (error) {
    console.warn("[preferences] discarding corrupted Voxel Realms preferences", error);
    return null;
  }
}

async function getPreferenceValue(key: string): Promise<string | null> {
  if (isBrowserTestEnv()) {
    return testPreferences.get(key) ?? null;
  }

  const { value } = await Preferences.get({ key });
  return value;
}

async function setPreferenceValue(key: string, value: string): Promise<void> {
  if (isBrowserTestEnv()) {
    testPreferences.set(key, value);
    return;
  }

  await Preferences.set({ key, value });
}

function isBrowserTestEnv(): boolean {
  return typeof window !== "undefined" && window.__VOXEL_REALMS_TEST__ === true;
}
