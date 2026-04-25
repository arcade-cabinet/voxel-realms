/**
 * Derived scan-pulse descriptor. Pure function — the frontend owns the
 * timer that feeds `dwellMs` and just renders what this returns.
 *
 * The scan acquisition itself is still instant (see evaluateRealmProgress)
 * so this does not change any engine telemetry; it only gives the HUD a
 * smooth, seedless ramp to animate the scan halo while the player sits
 * near an unscanned signal.
 */

import type { RealmSignalFocus } from "@world/signals";

export interface RealmSignalPulse {
  /** 0..1 — how bright the pulse ring should render right now. */
  intensity: number;
  /** 0..1 — sine-driven oscillation phase for halo animation. */
  phase: number;
  /** `true` once intensity has saturated above the "locked" threshold. */
  locked: boolean;
  /** Descriptor the HUD uses for the label under the scan ring. */
  label: "idle" | "sensing" | "locking" | "locked";
}

const DWELL_LOCK_MS = 480;
const DWELL_SENSING_MS = 120;
const LOCKED_INTENSITY = 0.85;
const PHASE_PERIOD_MS = 900;

export function summarizeRealmSignalPulse(
  focus: Pick<RealmSignalFocus, "inScanRange" | "proximity">,
  dwellMs: number
): RealmSignalPulse {
  const safeDwellMs = Math.max(0, dwellMs);

  if (!focus.inScanRange) {
    const idleIntensity = clamp(focus.proximity * 0.22, 0, 0.22);
    return {
      intensity: round(idleIntensity, 3),
      phase: 0,
      locked: false,
      label: idleIntensity > 0.01 ? "sensing" : "idle",
    };
  }

  const dwellRatio = clamp(safeDwellMs / DWELL_LOCK_MS, 0, 1);
  const intensity = clamp(0.32 + dwellRatio * 0.68, 0, 1);
  const phase = (safeDwellMs % PHASE_PERIOD_MS) / PHASE_PERIOD_MS;
  const locked = intensity >= LOCKED_INTENSITY;
  const label: RealmSignalPulse["label"] = locked
    ? "locked"
    : safeDwellMs >= DWELL_SENSING_MS
      ? "locking"
      : "sensing";

  return {
    intensity: round(intensity, 3),
    phase: round(phase, 3),
    locked,
    label,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

export const REALM_SIGNAL_PULSE_CONSTANTS = {
  DWELL_LOCK_MS,
  DWELL_SENSING_MS,
  LOCKED_INTENSITY,
  PHASE_PERIOD_MS,
} as const;
