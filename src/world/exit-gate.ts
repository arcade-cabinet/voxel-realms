export type RealmExitGateState = "locked" | "primed" | "open" | "collapsed";

export interface RealmExitGateInput {
  discoveredAnomalyCount: number;
  extractionState: "camp" | "ascending" | "extracted" | "collapsed";
  instabilityLevel: "stable" | "unstable" | "critical" | "collapsed";
  accent: string;
}

export interface RealmExitGateSummary {
  state: RealmExitGateState;
  label: string;
  color: string;
  emissiveIntensity: number;
  portalOpacity: number;
  ringOpacity: number;
}

export function summarizeRealmExitGate(input: RealmExitGateInput): RealmExitGateSummary {
  if (input.extractionState === "collapsed" || input.instabilityLevel === "collapsed") {
    return {
      state: "collapsed",
      label: "Gate collapsed",
      color: "#fb7185",
      emissiveIntensity: 0.18,
      portalOpacity: 0.08,
      ringOpacity: 0.16,
    };
  }

  if (input.extractionState === "extracted") {
    return {
      state: "open",
      label: "Gate open",
      color: "#f8fafc",
      emissiveIntensity: 0.72,
      portalOpacity: 0.5,
      ringOpacity: 0.75,
    };
  }

  if (input.discoveredAnomalyCount > 0) {
    return {
      state: "primed",
      label: "Gate primed",
      color: input.accent,
      emissiveIntensity: 0.48,
      portalOpacity: 0.28,
      ringOpacity: 0.52,
    };
  }

  return {
    state: "locked",
    label: "Gate locked",
    color: "#94a3b8",
    emissiveIntensity: 0.18,
    portalOpacity: 0.1,
    ringOpacity: 0.22,
  };
}
