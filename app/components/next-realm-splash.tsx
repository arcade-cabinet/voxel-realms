import { useEffect, useState } from "react";

/**
 * A short archetype brief shown for ~1.6 s when a new realm mounts.
 * Fires when `realmIndex` changes (deterministic trigger). Reads the
 * current realm's archetype so the Continue action in RealmCollapsed
 * or the Next button in the HUD lands directly on a readable splash.
 */

const SPLASH_REVEAL_MS = 160;
const SPLASH_HOLD_MS = 1_300;
const SPLASH_EXIT_MS = 200;

type SplashPhase = "hidden" | "rising" | "holding" | "leaving" | "done";

interface NextRealmSplashProps {
  realmIndex: number;
  archetypeId: string;
  archetypeName: string;
  archetypeVerb: string;
  archetypeVerbDetail: string;
}

export function NextRealmSplash({
  realmIndex,
  archetypeId: _archetypeId,
  archetypeName,
  archetypeVerb,
  archetypeVerbDetail,
}: NextRealmSplashProps) {
  const [phase, setPhase] = useState<SplashPhase>("hidden");

  // Deterministic: fires whenever realmIndex flips. Skips the initial
  // mount so the very first realm does not overlay the first-run coach.
  useEffect(() => {
    if (realmIndex === 0) return;

    let cancelled = false;
    const timers: number[] = [];

    setPhase("rising");
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) setPhase("holding");
      }, SPLASH_REVEAL_MS)
    );
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) setPhase("leaving");
      }, SPLASH_REVEAL_MS + SPLASH_HOLD_MS)
    );
    timers.push(
      window.setTimeout(
        () => {
          if (!cancelled) setPhase("done");
        },
        SPLASH_REVEAL_MS + SPLASH_HOLD_MS + SPLASH_EXIT_MS
      )
    );

    return () => {
      cancelled = true;
      for (const t of timers) window.clearTimeout(t);
    };
  }, [realmIndex]);

  if (phase === "hidden" || phase === "done") return null;

  const opacity = phase === "leaving" ? 0 : 1;
  const teaser = archetypeVerbDetail;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="next-realm-splash"
      data-phase={phase}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "clamp(3rem, 12vh, 7rem)",
        pointerEvents: "none",
        zIndex: 24,
      }}
    >
      <div
        style={{
          width: "min(100%, 560px)",
          margin: "0 auto",
          padding: "0.9rem 1.3rem",
          background: "rgba(8, 20, 24, 0.9)",
          border: "1px solid rgba(56, 189, 248, 0.55)",
          borderRadius: 12,
          color: "#f8fafc",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.42)",
          backdropFilter: "blur(12px)",
          textAlign: "center",
          opacity,
          transition: `opacity ${phase === "leaving" ? SPLASH_EXIT_MS : SPLASH_REVEAL_MS}ms ease-out`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "#7dd3fc",
            fontWeight: 900,
          }}
        >
          Next realm
        </div>
        <div
          style={{
            fontFamily: "var(--font-display, inherit)",
            fontSize: "clamp(1.1rem, 2.8vw, 1.4rem)",
            lineHeight: 1.1,
            marginTop: 4,
            fontWeight: 800,
            textTransform: "capitalize",
          }}
        >
          {archetypeName}
        </div>
        <div
          data-testid="next-realm-splash-verb"
          style={{
            fontSize: 12,
            color: "#a3e635",
            marginTop: 4,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            fontWeight: 800,
          }}
        >
          {archetypeVerb}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#cbd5e1",
            marginTop: 4,
            letterSpacing: 0.15,
          }}
        >
          {teaser}
        </div>
      </div>
    </div>
  );
}
