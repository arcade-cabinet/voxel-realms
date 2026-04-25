import { summarizeRealmSignalFocus } from "@world/signals";
import { describe, expect, test } from "vitest";

describe("realm signal focus", () => {
  test("reaches full focus inside scan radius", () => {
    expect(summarizeRealmSignalFocus(2.5, 3)).toEqual({
      distance: 2.5,
      scanRadius: 3,
      proximity: 1,
      inScanRange: true,
      tetherOpacity: 0.6,
      ringScale: 1,
    });
  });

  test("fades signal affordance outside scan radius", () => {
    const focus = summarizeRealmSignalFocus(12, 3);

    expect(focus.inScanRange).toBe(false);
    expect(focus.proximity).toBe(0.5);
    expect(focus.tetherOpacity).toBe(0.36);
    expect(focus.ringScale).toBe(0.86);
  });

  test("keeps distant signals visible at a low floor", () => {
    const focus = summarizeRealmSignalFocus(64, 3);

    expect(focus.proximity).toBe(0);
    expect(focus.tetherOpacity).toBe(0.12);
    expect(focus.ringScale).toBe(0.72);
  });
});
