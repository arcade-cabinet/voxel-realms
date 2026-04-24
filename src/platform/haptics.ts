import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { loadRealmPreferences } from "@platform";

/**
 * Native haptic cue helper. On native platforms (iOS / Android through
 * Capacitor) this fires the platform feedback generator. On web it
 * gracefully degrades via the Vibration API if present, otherwise a
 * no-op. Fire-and-forget; errors never propagate.
 */

export type VoxelRealmsHaptic = "jump-land" | "scan-complete" | "extract" | "collapse";

const CACHE_TTL_MS = 5_000;
let hapticsEnabledCache: { value: boolean; expiresAt: number } | null = null;

const STYLE_BY_HAPTIC: Record<VoxelRealmsHaptic, ImpactStyle> = {
  "jump-land": ImpactStyle.Light,
  "scan-complete": ImpactStyle.Medium,
  extract: ImpactStyle.Medium,
  collapse: ImpactStyle.Heavy,
};

const VIBRATION_MS_BY_HAPTIC: Record<VoxelRealmsHaptic, number> = {
  "jump-land": 12,
  "scan-complete": 28,
  extract: 42,
  collapse: 60,
};

async function isHapticsEnabled(): Promise<boolean> {
  const now = Date.now();
  if (hapticsEnabledCache && hapticsEnabledCache.expiresAt > now) {
    return hapticsEnabledCache.value;
  }
  try {
    const prefs = await loadRealmPreferences();
    hapticsEnabledCache = { value: prefs.hapticsEnabled, expiresAt: now + CACHE_TTL_MS };
    return prefs.hapticsEnabled;
  } catch {
    hapticsEnabledCache = { value: true, expiresAt: now + CACHE_TTL_MS };
    return true;
  }
}

/**
 * Force-refresh the cached haptics-enabled state. Call after the player
 * toggles haptics in Settings so the next cue reflects the preference.
 */
export function invalidateHapticsPreferencesCache(): void {
  hapticsEnabledCache = null;
}

/**
 * Fire a haptic cue. Tries the native Capacitor plugin first. On web,
 * falls back to navigator.vibrate when available. Any error is
 * swallowed — haptics MUST never crash the game or block rendering.
 */
export async function fireHaptic(haptic: VoxelRealmsHaptic): Promise<void> {
  const enabled = await isHapticsEnabled();
  if (!enabled) return;

  try {
    await Haptics.impact({ style: STYLE_BY_HAPTIC[haptic] });
    return;
  } catch {
    // Fall through to the web vibration fallback.
  }

  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(VIBRATION_MS_BY_HAPTIC[haptic]);
    }
  } catch {
    // Swallow — vibration failures are not fatal.
  }
}
