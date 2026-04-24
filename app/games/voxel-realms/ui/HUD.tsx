import { FloatingJoystick } from "@app/shared";
import {
  DEFAULT_REALM_RENDERABLE_ASSET_POLICY,
  formatRealmAssetBytes,
  summarizeRenderableRealmAnomalies,
} from "@world/asset-budget";
import { summarizeRealmExitGate } from "@world/exit-gate";
import { summarizeRealmRouteGuidance } from "@world/route-guidance";
import { createInitialVoxelState } from "@engine/voxel-simulation";
import {
  createNextRealmRuntime,
  RealmTrait,
  summarizeRealmExpedition,
  VoxelTrait,
} from "@store/traits";
import { voxelEntity } from "@store/world";
import { useTrait } from "koota/react";

type ControlEvent = "voxel:jump";

function isDebugHudEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has("debug-hud")) return true;
  try {
    return window.localStorage?.getItem("voxel-realms.debug-hud") === "1";
  } catch {
    return false;
  }
}

export function HUD() {
  const state = useTrait(voxelEntity, VoxelTrait);
  const realm = useTrait(voxelEntity, RealmTrait);
  const surveyStats = summarizeRealmExpedition(realm);
  const exitGate = summarizeRealmExitGate({
    discoveredAnomalyCount: realm.discoveredAnomalies.length,
    extractionState: realm.extractionState,
    instabilityLevel: realm.instabilityLevel,
    accent: realm.activeRealm.archetype.accent,
  });
  const routeGuidance = summarizeRealmRouteGuidance(realm.activeRealm, realm.agentPathIndex);
  const renderBudget = summarizeRenderableRealmAnomalies(
    realm.activeRealm.anomalies,
    realm.lastPlayerPosition
  );
  const hpRatio = state.hp / state.maxHp;
  const recentPickup =
    state.lastPickup && state.timeSurvived - state.lastPickup.elapsedMs < 2_500
      ? state.lastPickup
      : null;
  const recentBiome =
    state.biomeDiscovery && state.timeSurvived - state.biomeDiscovery.elapsedMs < 3_000
      ? state.biomeDiscovery
      : null;
  const recentScan =
    realm.lastScan && state.timeSurvived - realm.lastScan.elapsedMs < 3_000 ? realm.lastScan : null;
  const recentHazard =
    realm.lastHazard && state.timeSurvived - realm.lastHazard.elapsedMs < 2_200
      ? realm.lastHazard
      : null;
  const stabilityPercent = Math.round(Math.max(0, Math.min(1, realm.instabilityRatio)) * 100);
  const stabilityAccent =
    realm.instabilityLevel === "critical"
      ? "#fb7185"
      : realm.instabilityLevel === "unstable"
        ? "#f59e0b"
        : "#38bdf8";
  const debugHud = isDebugHudEnabled();
  const gateIcon =
    exitGate.state === "open"
      ? "◉"
      : exitGate.state === "primed"
        ? "◎"
        : exitGate.state === "collapsed"
          ? "✕"
          : "◌";

  const dispatchControl = (event: ControlEvent) => {
    window.dispatchEvent(new Event(event));
  };
  const dispatchMove = (x: number, y: number) => {
    window.dispatchEvent(new CustomEvent("voxel:move", { detail: { x, y } }));
  };
  const handleNextRealm = () => {
    voxelEntity.set(RealmTrait, createNextRealmRuntime(realm));
    voxelEntity.set(VoxelTrait, createInitialVoxelState("playing"));
    window.dispatchEvent(new Event("voxel:reset-player"));
  };
  const canAdvanceRealm =
    realm.extractionState === "extracted" || realm.extractionState === "collapsed";

  return (
    <div
      className="fixed inset-0 z-10 pointer-events-none"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: "0.75rem",
        padding: "clamp(0.65rem, 2vw, 1rem)",
        color: "#f8fafc",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <FloatingJoystick
        accent="#38bdf8"
        label="Voxel movement joystick"
        onChange={(vector) => dispatchMove(vector.x, vector.y)}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, max-content))",
          justifyContent: "space-between",
          gap: "0.65rem",
          alignItems: "start",
        }}
      >
        <Metric label="Survey" value={`${realm.objectiveProgress}%`} accent="#38bdf8" />
        <Metric
          label="Realm"
          value={`${realm.realmIndex + 1} ${realm.activeRealm.archetype.name} · ${realm.activeRealm.archetype.verb}`}
          accent="#a3e635"
        />
        <Metric
          label="Signals"
          value={`${realm.discoveredAnomalies.length}/${realm.activeRealm.anomalies.length}`}
          accent="#facc15"
        />
        <Metric label="Stability" value={`${stabilityPercent}%`} accent={stabilityAccent} />
        <Metric label="HP" value={`${state.hp}/${state.maxHp}`} accent="#fb7185" align="right" />
      </div>

      <div />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: "0.75rem",
          alignItems: "end",
        }}
      >
        <div
          style={{
            maxWidth: 560,
            border: "1px solid rgba(14, 165, 233, 0.35)",
            background: "rgba(8, 20, 24, 0.72)",
            boxShadow: "0 14px 40px rgba(0, 0, 0, 0.25)",
            borderRadius: 8,
            padding: "0.72rem 0.82rem",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              color: "#cbd5e1",
              fontSize: 12,
              letterSpacing: 0,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            <span
              style={{
                color: exitGate.color,
                background: "rgba(15, 23, 42, 0.45)",
                padding: "0.2rem 0.55rem",
                borderRadius: 999,
                border: `1px solid ${exitGate.color}55`,
                fontWeight: 900,
                letterSpacing: 0.3,
              }}
            >
              {gateIcon} {exitGate.label}
            </span>
            <span style={{ color: realm.activeRealm.archetype.accent }}>
              {routeGuidance.label}: {routeGuidance.detail}
            </span>
            {routeGuidance.hazardLabel ? (
              <span style={{ color: routeGuidance.activeHazard?.color ?? "#fb7185" }}>
                {routeGuidance.hazardLabel}
              </span>
            ) : null}
          </div>
          {debugHud ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginTop: 6,
                color: "#94a3b8",
                fontSize: 10,
                letterSpacing: 0,
                textTransform: "uppercase",
              }}
            >
              <span>
                XYZ {state.coordinates.x}, {state.coordinates.y}, {state.coordinates.z}
              </span>
              <span>{Math.round(state.nearestLandmarkDistance)}M beacon</span>
              <span>
                {realm.nearestAnomalyLabel
                  ? `${Math.round(realm.nearestAnomalyDistance)}M signal`
                  : "Signals logged"}
              </span>
              <span>
                Step {realm.agentPathIndex + 1}/{realm.activeRealm.goldenPath.length}
              </span>
              <span>
                Models {renderBudget.selectedModels}/
                {DEFAULT_REALM_RENDERABLE_ASSET_POLICY.maxActiveModels} ·{" "}
                {renderBudget.selectedBytesLabel}/
                {formatRealmAssetBytes(DEFAULT_REALM_RENDERABLE_ASSET_POLICY.maxActiveBytes)}
              </span>
            </div>
          ) : null}
          <div
            aria-live="polite"
            aria-atomic="true"
            style={{ color: "#f8fafc", fontWeight: 800, lineHeight: 1.25 }}
          >
            {realm.objective}
          </div>
          {debugHud ? <ModelBudgetReadout budget={renderBudget} /> : null}
          <div aria-live="polite" aria-atomic="false" style={{ display: "contents" }}>
            {recentPickup ? (
              <div
                style={{
                  color: "#facc15",
                  fontSize: 12,
                  fontWeight: 900,
                  marginTop: 6,
                  textTransform: "uppercase",
                }}
              >
                Pickup {recentPickup.label}
              </div>
            ) : null}
            {recentBiome ? (
              <div
                style={{
                  color: "#a3e635",
                  fontSize: 12,
                  fontWeight: 900,
                  marginTop: 4,
                  textTransform: "uppercase",
                }}
              >
                Biome discovered: {recentBiome.biome}
              </div>
            ) : null}
            {recentScan ? (
              <div
                style={{
                  color: "#38bdf8",
                  fontSize: 12,
                  fontWeight: 900,
                  marginTop: 4,
                  textTransform: "uppercase",
                }}
              >
                Signal scanned: {recentScan.label}
              </div>
            ) : null}
            {recentHazard ? (
              <div
                style={{
                  color: "#fb7185",
                  fontSize: 12,
                  fontWeight: 900,
                  marginTop: 4,
                  textTransform: "uppercase",
                }}
              >
                Hazard pressure: {recentHazard.kind}
              </div>
            ) : null}
          </div>
          <div
            style={{
              marginTop: "0.52rem",
              height: 6,
              borderRadius: 999,
              background: "rgba(15, 23, 42, 0.78)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(100, hpRatio * 100))}%`,
                height: "100%",
                background: "linear-gradient(90deg, #fb7185, #f59e0b)",
              }}
            />
          </div>
          <BlockHotbar inventory={state.inventory} />
          <SurveyLog stats={surveyStats} />
        </div>

        <div
          className="pointer-events-auto"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
          }}
        >
          {canAdvanceRealm ? (
            <ControlButton
              label={realm.extractionState === "collapsed" ? "Reroll" : "Next"}
              onPointerDown={handleNextRealm}
            />
          ) : null}
          <ControlButton label="Jump" onPointerDown={() => dispatchControl("voxel:jump")} />
        </div>
      </div>
    </div>
  );
}

function ModelBudgetReadout({
  budget,
}: {
  budget: ReturnType<typeof summarizeRenderableRealmAnomalies>;
}) {
  const selectedLabel = budget.nearestSelected
    ? `nearest ${budget.nearestSelected.label} ${Math.round(budget.nearestSelected.distance)}m`
    : "marker-only";

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.45rem",
        alignItems: "center",
        marginTop: 6,
        color: "#cbd5e1",
        fontSize: 11,
        fontWeight: 800,
        textTransform: "uppercase",
      }}
    >
      <span style={{ color: budget.selectedModels > 0 ? "#a3e635" : "#94a3b8" }}>
        GLB {budget.selectedModels}/{budget.totalAnomalies}
      </span>
      <span>
        inline {budget.selectedInlineModels} / safe {budget.selectedSafeModels}
      </span>
      <span>
        marker {budget.markerOnlyAnomalies} · deferred {budget.deferredAnomalies} · ref{" "}
        {budget.referenceAnomalies}
      </span>
      <span>{selectedLabel}</span>
    </div>
  );
}

function SurveyLog({ stats }: { stats: ReturnType<typeof summarizeRealmExpedition> }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, max-content))",
        gap: "0.45rem",
        alignItems: "center",
        marginTop: "0.65rem",
        color: "#cbd5e1",
        fontSize: 11,
        textTransform: "uppercase",
      }}
    >
      <span>Run {stats.currentRealmNumber}</span>
      <span>
        Cycle {stats.currentCyclePosition}/{stats.currentCycleSize}
      </span>
      <span>
        {stats.extractedCount} extracted / {stats.collapsedCount} collapsed
      </span>
      <span>{stats.totalSignals} signals</span>
      {stats.lastCompleted ? (
        <span
          style={{
            gridColumn: "1 / -1",
            color: stats.lastCompleted.outcome === "collapsed" ? "#fb7185" : "#a3e635",
            fontWeight: 900,
          }}
        >
          Last {stats.lastCompleted.archetype} {stats.lastCompleted.outcome}
        </span>
      ) : null}
    </div>
  );
}

function BlockHotbar({ inventory }: { inventory: string[] }) {
  const slots = [
    { label: "Stone", color: "#8b98a6", available: true },
    { label: "Ore", color: "#c56a28", available: inventory.includes("Copper") },
    {
      label: "Wood",
      color: "#6b4423",
      available: inventory.includes("Sapwood"),
    },
    {
      label: "Leaves",
      color: "#2f8f3a",
      available: inventory.includes("Sapwood"),
    },
    { label: "Sand", color: "#e7c86e", available: true },
    {
      label: "Water",
      color: "#38bdf8",
      available: inventory.includes("Water"),
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.35rem",
        marginTop: "0.65rem",
      }}
    >
      {slots.map((slot, index) => (
        <div
          key={slot.label}
          aria-label={`${slot.label} ${slot.available ? "available" : "survey pending"}`}
          role="img"
          title={`${slot.label}: ${slot.available ? "available" : "survey pending"}`}
          style={{
            position: "relative",
            width: "2rem",
            height: "2rem",
            border:
              index === 0
                ? "2px solid #facc15"
                : slot.available
                  ? "1px solid rgba(226,232,240,0.5)"
                  : "1px solid rgba(148,163,184,0.22)",
            borderRadius: 6,
            background: slot.color,
            boxShadow:
              index === 0 ? "0 0 14px rgba(250,204,21,0.4)" : "0 8px 16px rgba(0,0,0,0.22)",
            filter: slot.available ? undefined : "grayscale(0.75) brightness(0.55)",
          }}
        >
          {slot.available ? (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                right: 4,
                bottom: 4,
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#f8fafc",
                boxShadow: "0 0 8px rgba(248,250,252,0.85)",
              }}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  align = "left",
}: {
  label: string;
  value: string;
  accent: string;
  align?: "left" | "right";
}) {
  return (
    <div
      style={{
        minWidth: "min(9rem, 30vw)",
        border: "1px solid rgba(148, 163, 184, 0.28)",
        background: "rgba(8, 20, 24, 0.68)",
        boxShadow: "0 14px 40px rgba(0, 0, 0, 0.25)",
        borderRadius: 8,
        padding: "0.65rem 0.72rem",
        textAlign: align,
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 0,
          color: "#94a3b8",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "clamp(1rem, 3.5vw, 1.65rem)",
          fontWeight: 900,
          color: accent,
          lineHeight: 1.05,
          textShadow: `0 0 12px ${accent}66`,
          textTransform: label === "Biome" ? "capitalize" : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
}: {
  label: string;
  onPointerDown: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      style={{
        width: "3.6rem",
        height: "3.4rem",
        borderRadius: 8,
        border: "1px solid rgba(56, 189, 248, 0.58)",
        background: "rgba(14, 165, 233, 0.16)",
        color: "#e0f2fe",
        fontWeight: 900,
        letterSpacing: 0,
        textTransform: "uppercase",
        boxShadow: "0 0 18px rgba(14, 165, 233, 0.22)",
        touchAction: "none",
      }}
    >
      {label}
    </button>
  );
}
