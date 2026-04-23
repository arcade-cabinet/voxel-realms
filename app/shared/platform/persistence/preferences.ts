import { Preferences } from "@capacitor/preferences";

const REALM_PREFERENCES_KEY = "voxel-realms.preferences.v1";

export interface RealmPlayerPreferences {
  audioEnabled: boolean;
  motionReduced: boolean;
  hapticsEnabled: boolean;
  onboardingSeen: boolean;
}

export const DEFAULT_REALM_PREFERENCES: RealmPlayerPreferences = {
  audioEnabled: true,
  motionReduced: false,
  hapticsEnabled: true,
  onboardingSeen: false,
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

export async function saveRealmPreferences(
  preferences: Partial<RealmPlayerPreferences>
): Promise<RealmPlayerPreferences> {
  const next = normalizeRealmPreferences(preferences);
  await setPreferenceValue(REALM_PREFERENCES_KEY, JSON.stringify(next));
  return next;
}

export async function updateRealmPreferences(
  preferences: Partial<RealmPlayerPreferences>
): Promise<RealmPlayerPreferences> {
  const current = await loadRealmPreferences();
  return saveRealmPreferences({ ...current, ...preferences });
}

export async function resetRealmPreferencesForTests(): Promise<void> {
  if (isBrowserTestEnv()) {
    testPreferences.clear();
    return;
  }

  await Preferences.remove({ key: REALM_PREFERENCES_KEY });
}

function normalizeRealmPreferences(
  preferences: Partial<RealmPlayerPreferences> | null
): RealmPlayerPreferences {
  return {
    ...DEFAULT_REALM_PREFERENCES,
    ...preferences,
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
