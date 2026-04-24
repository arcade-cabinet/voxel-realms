import { GameOverScreen, OverlayButton } from "@app/shared";
import { recordExpeditionScore } from "@app/shared/platform/persistence/preferences";
import type { ExpeditionScore } from "@logic/games/voxel-realms/engine/progression";
import type { summarizeRealmExpedition } from "@logic/games/voxel-realms/store/traits";
import { useEffect } from "react";

type ExpeditionSummary = ReturnType<typeof summarizeRealmExpedition>;

interface RealmCollapsedScreenProps {
  archetype: string;
  signalsScanned: number;
  expedition: ExpeditionSummary;
  score: ExpeditionScore;
  onContinue: () => void;
  onRetry: () => void;
  onRestart: () => void;
}

export function RealmCollapsedScreen({
  archetype,
  signalsScanned,
  expedition,
  score,
  onContinue,
  onRetry,
  onRestart,
}: RealmCollapsedScreenProps) {
  const nextCyclePosition =
    expedition.currentCyclePosition === expedition.currentCycleSize
      ? 1
      : expedition.currentCyclePosition + 1;

  // Persist the score for this expedition snapshot. Fire-and-forget;
  // persistence failures must not block the collapse screen render.
  useEffect(() => {
    void recordExpeditionScore({
      score: score.score,
      totalSignals: score.totalSignals,
      extractedCount: score.extractedCount,
      collapsedCount: score.collapsedCount,
      completedCount: score.completedCount,
      bestStabilityRemaining: score.bestStabilityRemaining,
      rank: score.rank,
      rankLabel: score.rankLabel,
    }).catch(() => undefined);
  }, [
    score.score,
    score.totalSignals,
    score.extractedCount,
    score.collapsedCount,
    score.completedCount,
    score.bestStabilityRemaining,
    score.rank,
    score.rankLabel,
  ]);

  return (
    <GameOverScreen
      title="REALM COLLAPSED"
      subtitle={`${archetype} · ${signalsScanned} signal${signalsScanned === 1 ? "" : "s"} scanned`}
      actions={
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              color: "var(--realm-cyan, #41dce8)",
              fontSize: 11,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              fontWeight: 900,
            }}
          >
            Expedition score {score.score.toLocaleString()} · {score.rankLabel}
          </div>
          <div
            style={{
              color: "var(--realm-mist, #aab9bd)",
              fontSize: 12,
              letterSpacing: 0,
              textTransform: "uppercase",
            }}
          >
            {expedition.extractedCount} extracted · {expedition.collapsedCount} collapsed ·{" "}
            {expedition.totalSignals} total signals
          </div>
          <OverlayButton onClick={onContinue}>
            Continue expedition · Cycle {nextCyclePosition}/{expedition.currentCycleSize}
          </OverlayButton>
          <button
            type="button"
            onClick={onRetry}
            data-testid="realm-collapsed-retry"
            style={{
              background: "transparent",
              border: "1px solid rgba(65, 220, 232, 0.5)",
              color: "var(--realm-cyan, #41dce8)",
              padding: "0.55rem 1rem",
              borderRadius: 6,
              fontSize: 12,
              letterSpacing: 0.2,
              textTransform: "uppercase",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Retry this realm · Same seed
          </button>
          <button
            type="button"
            onClick={onRestart}
            style={{
              background: "transparent",
              border: "1px solid var(--realm-border, rgba(247, 243, 223, 0.22))",
              color: "var(--realm-mist, #aab9bd)",
              padding: "0.5rem 1rem",
              borderRadius: 6,
              fontSize: 12,
              letterSpacing: 0,
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Abandon · New expedition
          </button>
        </div>
      }
    />
  );
}
