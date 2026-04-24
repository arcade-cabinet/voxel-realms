import { useEffect, useState } from "react";

interface ExtractionBeatProps {
  extractionState: "camp" | "ascending" | "extracted" | "collapsed";
  archetype: string;
  signalsScanned: number;
  nextArchetype: string;
  /**
   * Called when the beat animation finishes. Parent is expected to
   * reveal the continue/extract affordance after this fires.
   */
  onBeatComplete?: () => void;
}

const BEAT_REVEAL_MS = 180;
const BEAT_HOLD_MS = 1_400;
const BEAT_EXIT_MS = 220;

type BeatPhase = "hidden" | "rising" | "holding" | "leaving" | "done";

/**
 * A short 1.6–1.8 s moment that fires once when the realm transitions to
 * `extracted`. Intentionally deterministic: a fixed timeline driven by
 * the state change, not RNG or frame-dependent animation.
 */
export function ExtractionBeat({
  extractionState,
  archetype,
  signalsScanned,
  nextArchetype,
  onBeatComplete,
}: ExtractionBeatProps) {
  const [phase, setPhase] = useState<BeatPhase>("hidden");

  useEffect(() => {
    if (extractionState !== "extracted") {
      setPhase("hidden");
      return;
    }

    let cancelled = false;
    const timers: number[] = [];

    setPhase("rising");
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) setPhase("holding");
      }, BEAT_REVEAL_MS)
    );
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) setPhase("leaving");
      }, BEAT_REVEAL_MS + BEAT_HOLD_MS)
    );
    timers.push(
      window.setTimeout(
        () => {
          if (!cancelled) {
            setPhase("done");
            onBeatComplete?.();
          }
        },
        BEAT_REVEAL_MS + BEAT_HOLD_MS + BEAT_EXIT_MS
      )
    );

    return () => {
      cancelled = true;
      for (const t of timers) window.clearTimeout(t);
    };
  }, [extractionState, onBeatComplete]);

  if (phase === "hidden" || phase === "done") return null;

  const opacity = phase === "leaving" ? 0 : 1;
  const scale = phase === "rising" ? 0.96 : 1;
  const transitionMs =
    phase === "rising" ? BEAT_REVEAL_MS : phase === "leaving" ? BEAT_EXIT_MS : 120;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="extraction-beat"
      data-phase={phase}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 25,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(163, 230, 53, 0.18), rgba(7, 16, 18, 0.58))",
          opacity,
          transition: `opacity ${transitionMs}ms ease-out`,
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          padding: "1.1rem 1.6rem",
          background: "rgba(8, 20, 24, 0.88)",
          border: "1px solid rgba(163, 230, 53, 0.65)",
          borderRadius: 14,
          color: "#f8fafc",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(12px)",
          opacity,
          transform: `scale(${scale})`,
          transition: `opacity ${transitionMs}ms ease-out, transform ${transitionMs}ms ease-out`,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "#a3e635",
            fontWeight: 900,
          }}
        >
          Extracted
        </span>
        <span
          style={{
            fontFamily: "var(--font-display, inherit)",
            fontSize: "clamp(1.2rem, 3vw, 1.6rem)",
            lineHeight: 1.1,
            fontWeight: 800,
          }}
        >
          {archetype}
        </span>
        <span
          style={{
            fontSize: 12,
            color: "#cbd5e1",
            letterSpacing: 0.2,
            textTransform: "uppercase",
          }}
        >
          {signalsScanned} signal{signalsScanned === 1 ? "" : "s"} · next: {nextArchetype}
        </span>
      </div>
    </div>
  );
}
