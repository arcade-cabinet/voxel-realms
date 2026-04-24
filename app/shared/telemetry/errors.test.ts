import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  clearCapturedErrors,
  disableErrorTelemetry,
  enableErrorTelemetry,
  getCapturedErrors,
  isErrorTelemetryEnabled,
  resetErrorTelemetryForTests,
} from "./errors";

describe("error telemetry", () => {
  beforeEach(() => {
    resetErrorTelemetryForTests();
  });

  afterEach(() => {
    resetErrorTelemetryForTests();
  });

  test("is off by default", () => {
    expect(isErrorTelemetryEnabled()).toBe(false);
    expect(getCapturedErrors()).toEqual([]);
  });

  test("captures uncaught errors when enabled", () => {
    enableErrorTelemetry();
    window.dispatchEvent(
      new ErrorEvent("error", {
        error: new Error("boom"),
        message: "boom",
      })
    );
    const captured = getCapturedErrors();
    expect(captured).toHaveLength(1);
    expect(captured[0]?.source).toBe("error");
    expect(captured[0]?.message).toBe("boom");
  });

  test("captures unhandled rejections when enabled", () => {
    enableErrorTelemetry();
    // Dispatch synthesized PromiseRejectionEvent. jsdom may not have
    // the constructor so fall back to a CustomEvent shape the handler
    // will read identically.
    const reason = new Error("async boom");
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", { value: reason });
    window.dispatchEvent(event);

    const captured = getCapturedErrors();
    expect(captured).toHaveLength(1);
    expect(captured[0]?.source).toBe("unhandledrejection");
    expect(captured[0]?.message).toBe("async boom");
  });

  test("ignores errors when disabled", () => {
    enableErrorTelemetry();
    disableErrorTelemetry();
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("x"), message: "x" }));
    expect(getCapturedErrors()).toEqual([]);
  });

  test("redacts /Users/ paths in stack traces", () => {
    enableErrorTelemetry();
    const err = new Error("path leak");
    err.stack = "at line1 (/Users/claude/secret/file.ts:1:1)";
    window.dispatchEvent(new ErrorEvent("error", { error: err, message: err.message }));
    const captured = getCapturedErrors();
    expect(captured[0]?.stack).not.toContain("/Users/claude");
    expect(captured[0]?.stack).toContain("/Users/<redacted>");
  });

  test("buffer is bounded to 30 entries", () => {
    enableErrorTelemetry();
    for (let i = 0; i < 50; i++) {
      window.dispatchEvent(
        new ErrorEvent("error", { error: new Error(`e${i}`), message: `e${i}` })
      );
    }
    const captured = getCapturedErrors();
    expect(captured.length).toBeLessThanOrEqual(30);
    // Oldest entries must have rolled off — e0 should be gone.
    expect(captured.some((entry) => entry.message === "e0")).toBe(false);
    expect(captured.at(-1)?.message).toBe("e49");
  });

  test("clearCapturedErrors empties the buffer", () => {
    enableErrorTelemetry();
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("x"), message: "x" }));
    expect(getCapturedErrors().length).toBeGreaterThan(0);
    clearCapturedErrors();
    expect(getCapturedErrors()).toEqual([]);
  });
});
