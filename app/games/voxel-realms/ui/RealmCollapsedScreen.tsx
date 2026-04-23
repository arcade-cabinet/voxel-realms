import { GameOverScreen, OverlayButton } from "@app/shared";
import type { summarizeRealmExpedition } from "@logic/games/voxel-realms/store/traits";

type ExpeditionSummary = ReturnType<typeof summarizeRealmExpedition>;

interface RealmCollapsedScreenProps {
  archetype: string;
  signalsScanned: number;
  expedition: ExpeditionSummary;
  onContinue: () => void;
  onRestart: () => void;
}

export function RealmCollapsedScreen({
  archetype,
  signalsScanned,
  expedition,
  onContinue,
  onRestart,
}: RealmCollapsedScreenProps) {
  const nextCyclePosition =
    expedition.currentCyclePosition === expedition.currentCycleSize
      ? 1
      : expedition.currentCyclePosition + 1;

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
              color: "#cbd5e1",
              fontSize: 12,
              letterSpacing: 0,
              textTransform: "uppercase",
            }}
          >
            Expedition {expedition.extractedCount} extracted · {expedition.collapsedCount} collapsed
            · {expedition.totalSignals} total signals
          </div>
          <OverlayButton onClick={onContinue}>
            Continue expedition · Cycle {nextCyclePosition}/{expedition.currentCycleSize}
          </OverlayButton>
          <button
            type="button"
            onClick={onRestart}
            style={{
              background: "transparent",
              border: "1px solid rgba(148, 163, 184, 0.4)",
              color: "#cbd5e1",
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
