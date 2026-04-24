import { describe, expect, test } from "vitest";
import { REALM_SIGNAL_PULSE_CONSTANTS, summarizeRealmSignalPulse } from "@world/signal-pulse";

describe("realm signal pulse", () => {
  test("reports idle when player is out of range and far away", () => {
    const pulse = summarizeRealmSignalPulse({ inScanRange: false, proximity: 0 }, 0);
    expect(pulse.label).toBe("idle");
    expect(pulse.intensity).toBe(0);
    expect(pulse.locked).toBe(false);
  });

  test("reports sensing when player is closing in but not in range yet", () => {
    const pulse = summarizeRealmSignalPulse({ inScanRange: false, proximity: 0.5 }, 0);
    expect(pulse.label).toBe("sensing");
    expect(pulse.intensity).toBeGreaterThan(0);
    expect(pulse.intensity).toBeLessThan(0.25);
    expect(pulse.locked).toBe(false);
  });

  test("ramps intensity during dwell while inside scan range", () => {
    const start = summarizeRealmSignalPulse({ inScanRange: true, proximity: 1 }, 0);
    const mid = summarizeRealmSignalPulse({ inScanRange: true, proximity: 1 }, 240);
    const end = summarizeRealmSignalPulse(
      { inScanRange: true, proximity: 1 },
      REALM_SIGNAL_PULSE_CONSTANTS.DWELL_LOCK_MS
    );
    expect(start.intensity).toBeLessThan(mid.intensity);
    expect(mid.intensity).toBeLessThan(end.intensity);
    expect(end.intensity).toBe(1);
    expect(start.label).toBe("sensing");
    expect(mid.label).toBe("locking");
    expect(end.label).toBe("locked");
    expect(end.locked).toBe(true);
  });

  test("phase oscillates between 0 and 1 across the period", () => {
    const quarter = summarizeRealmSignalPulse(
      { inScanRange: true, proximity: 1 },
      REALM_SIGNAL_PULSE_CONSTANTS.PHASE_PERIOD_MS / 4
    );
    const half = summarizeRealmSignalPulse(
      { inScanRange: true, proximity: 1 },
      REALM_SIGNAL_PULSE_CONSTANTS.PHASE_PERIOD_MS / 2
    );
    expect(quarter.phase).toBeCloseTo(0.25, 2);
    expect(half.phase).toBeCloseTo(0.5, 2);
  });

  test("negative or NaN-like dwellMs clamps to zero", () => {
    const pulse = summarizeRealmSignalPulse({ inScanRange: true, proximity: 1 }, -500);
    expect(pulse.intensity).toBeGreaterThanOrEqual(0.32);
    expect(pulse.label).toBe("sensing");
  });
});
