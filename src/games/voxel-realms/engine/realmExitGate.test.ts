import { describe, expect, test } from "vitest";
import { summarizeRealmExitGate } from "./realmExitGate";

describe("realm exit gate", () => {
  test("locks until at least one anomaly is scanned", () => {
    expect(
      summarizeRealmExitGate({
        discoveredAnomalyCount: 0,
        extractionState: "camp",
        instabilityLevel: "stable",
        accent: "#38bdf8",
      })
    ).toMatchObject({
      state: "locked",
      label: "Gate locked",
      color: "#94a3b8",
    });
  });

  test("primes after a scan without marking extraction complete", () => {
    expect(
      summarizeRealmExitGate({
        discoveredAnomalyCount: 1,
        extractionState: "ascending",
        instabilityLevel: "unstable",
        accent: "#f59e0b",
      })
    ).toMatchObject({
      state: "primed",
      label: "Gate primed",
      color: "#f59e0b",
    });
  });

  test("opens only after extraction and collapse always wins", () => {
    expect(
      summarizeRealmExitGate({
        discoveredAnomalyCount: 2,
        extractionState: "extracted",
        instabilityLevel: "critical",
        accent: "#84cc16",
      }).state
    ).toBe("open");
    expect(
      summarizeRealmExitGate({
        discoveredAnomalyCount: 2,
        extractionState: "extracted",
        instabilityLevel: "collapsed",
        accent: "#84cc16",
      }).state
    ).toBe("collapsed");
  });
});
