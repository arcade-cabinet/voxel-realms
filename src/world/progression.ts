/**
 * Expedition progression scoring.
 *
 * Pure deterministic function — given the same expedition input, always
 * produces the same score and rank. Lives in the engine layer so the
 * same contract can feed HUD, landing screens, replay verification, and
 * tests without importing React.
 *
 * Scoring formula (v1):
 *   baseSignalScore = totalSignals * SIGNAL_WEIGHT
 *   extractionBonus = extractedCount * EXTRACTION_BONUS
 *   collapsePenalty = collapsedCount * COLLAPSE_PENALTY
 *   stabilityBonus  = bestStabilityRemaining / 2 (stability is 0..100)
 *   score = max(0, round(base + bonus + stability - penalty))
 *
 * Ranks are fixed thresholds. Keep them conservative — players should be
 * able to earn each rank inside a reasonable number of realms.
 */

import type { RealmRuntimeState } from "@store/traits";

export const SIGNAL_WEIGHT = 50;
export const EXTRACTION_BONUS = 200;
export const COLLAPSE_PENALTY = 40;

export type ExpeditionRank =
  | "candidate"
  | "surveyor"
  | "senior-surveyor"
  | "chief-surveyor"
  | "legend";

export interface ExpeditionScore {
  score: number;
  totalSignals: number;
  extractedCount: number;
  collapsedCount: number;
  completedCount: number;
  bestStabilityRemaining: number;
  rank: ExpeditionRank;
  rankLabel: string;
}

export interface ExpeditionScoreInput {
  completedRealms: RealmRuntimeState["completedRealms"];
  inFlightScannedAnomalies: number;
}

const RANK_THRESHOLDS: Array<{ min: number; rank: ExpeditionRank; label: string }> = [
  { min: 0, rank: "candidate", label: "Candidate surveyor" },
  { min: 300, rank: "surveyor", label: "Surveyor" },
  { min: 900, rank: "senior-surveyor", label: "Senior surveyor" },
  { min: 1_800, rank: "chief-surveyor", label: "Chief surveyor" },
  { min: 3_500, rank: "legend", label: "Expedition legend" },
];

export function scoreExpedition(input: ExpeditionScoreInput): ExpeditionScore {
  const completed = input.completedRealms;
  const totalSignals =
    completed.reduce((sum, realm) => sum + realm.scannedAnomalies, 0) +
    input.inFlightScannedAnomalies;
  const extractedCount = completed.filter((realm) => realm.outcome === "extracted").length;
  const collapsedCount = completed.filter((realm) => realm.outcome === "collapsed").length;
  const bestStabilityRemaining = completed.reduce(
    (max, realm) => Math.max(max, realm.stabilityRemaining),
    0
  );

  const raw =
    totalSignals * SIGNAL_WEIGHT +
    extractedCount * EXTRACTION_BONUS -
    collapsedCount * COLLAPSE_PENALTY +
    Math.floor(bestStabilityRemaining / 2);
  const score = Math.max(0, Math.round(raw));
  const { rank, label } = rankForScore(score);

  return {
    score,
    totalSignals,
    extractedCount,
    collapsedCount,
    completedCount: completed.length,
    bestStabilityRemaining,
    rank,
    rankLabel: label,
  };
}

export function scoreExpeditionFromRealmState(state: RealmRuntimeState): ExpeditionScore {
  return scoreExpedition({
    completedRealms: state.completedRealms,
    inFlightScannedAnomalies: state.discoveredAnomalies.length,
  });
}

export function rankForScore(score: number): {
  rank: ExpeditionRank;
  label: string;
} {
  let current = RANK_THRESHOLDS[0];
  if (!current) {
    return { rank: "candidate", label: "Candidate surveyor" };
  }
  for (const threshold of RANK_THRESHOLDS) {
    if (score >= threshold.min) {
      current = threshold;
    }
  }
  return { rank: current.rank, label: current.label };
}
