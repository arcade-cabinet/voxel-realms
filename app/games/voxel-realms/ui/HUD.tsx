import { FloatingJoystick } from "@app/shared";
import { VoxelTrait } from "@logic/games/voxel-realms/store/traits";
import { voxelEntity } from "@logic/games/voxel-realms/store/world";
import { useTrait } from "koota/react";

type ControlEvent = "voxel:jump";

export function HUD() {
  const state = useTrait(voxelEntity, VoxelTrait);
  const hpRatio = state.hp / state.maxHp;
  const recentPickup =
    state.lastPickup && state.timeSurvived - state.lastPickup.elapsedMs < 2_500
      ? state.lastPickup
      : null;
  const recentBiome =
    state.biomeDiscovery && state.timeSurvived - state.biomeDiscovery.elapsedMs < 3_000
      ? state.biomeDiscovery
      : null;

  const dispatchControl = (event: ControlEvent) => {
    window.dispatchEvent(new Event(event));
  };
  const dispatchMove = (x: number, y: number) => {
    window.dispatchEvent(new CustomEvent("voxel:move", { detail: { x, y } }));
  };

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
          gridTemplateColumns: "repeat(4, minmax(0, max-content))",
          justifyContent: "space-between",
          gap: "0.65rem",
          alignItems: "start",
        }}
      >
        <Metric label="Survey" value={`${state.objectiveProgress}%`} accent="#38bdf8" />
        <Metric label="Biome" value={state.biome} accent="#a3e635" />
        <Metric label="Kit" value={`${state.inventory.length}/3`} accent="#facc15" />
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
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: "0.75rem",
              color: "#94a3b8",
              fontSize: 11,
              letterSpacing: 0,
              textTransform: "uppercase",
            }}
          >
            <span>
              XYZ {state.coordinates.x}, {state.coordinates.y}, {state.coordinates.z}
            </span>
            <span>{Math.round(state.nearestLandmarkDistance)}M beacon</span>
            <span>{Math.round(state.nearestResourceDistance)}M resource</span>
          </div>
          <div style={{ color: "#f8fafc", fontWeight: 800, lineHeight: 1.25 }}>
            {state.objective}
          </div>
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
        </div>

        <div
          className="pointer-events-auto"
          style={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <ControlButton label="Jump" onPointerDown={() => dispatchControl("voxel:jump")} />
        </div>
      </div>
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
