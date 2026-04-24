import { App as CapacitorApp } from "@capacitor/app";
import { useEffect } from "react";

interface PauseOverlayProps {
  onResume: () => void;
  onOpenSettings: () => void;
  onRestartRealm: () => void;
  onAbandon: () => void;
}

/**
 * Pause overlay shown over the playing scene. Rendered only while
 * paused; the parent controls the paused flag. Disposed when resumed.
 *
 * Wires up:
 *  - Escape on keyboard to resume.
 *  - Capacitor App backButton on Android/iOS to resume (one "back" tap
 *    dismisses the pause overlay; a second tap would leave the app,
 *    handled by the plugin's default behavior).
 */
export function PauseOverlay({
  onResume,
  onOpenSettings,
  onRestartRealm,
  onAbandon,
}: PauseOverlayProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        event.preventDefault();
        onResume();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onResume]);

  useEffect(() => {
    let cancelled = false;
    let handle: { remove: () => Promise<void> } | null = null;
    (async () => {
      try {
        const listener = await CapacitorApp.addListener("backButton", () => {
          onResume();
        });
        if (cancelled) {
          await listener.remove();
        } else {
          handle = listener;
        }
      } catch {
        // Web platform — the plugin throws; no backButton event exists.
      }
    })();
    return () => {
      cancelled = true;
      handle?.remove().catch(() => undefined);
    };
  }, [onResume]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-overlay-title"
      data-testid="pause-overlay"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 35,
        background: "rgba(7, 16, 18, 0.8)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          width: "min(100%, 440px)",
          padding: "1.3rem 1.4rem 1.2rem",
          background: "rgba(8, 20, 24, 0.96)",
          border: "1px solid rgba(56, 189, 248, 0.45)",
          borderRadius: 14,
          color: "#f8fafc",
          boxShadow: "0 28px 60px rgba(0, 0, 0, 0.55)",
        }}
      >
        <h2
          id="pause-overlay-title"
          style={{
            fontFamily: "var(--font-display, inherit)",
            fontSize: "clamp(1.2rem, 3vw, 1.6rem)",
            lineHeight: 1.1,
            margin: 0,
            fontWeight: 800,
          }}
        >
          Paused
        </h2>
        <p
          style={{
            fontSize: 12,
            color: "#94a3b8",
            marginTop: 6,
            marginBottom: 16,
            letterSpacing: 0.15,
          }}
        >
          Resume to keep climbing. Timer and scan state are preserved.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <PauseButton label="Resume" emphasis="primary" onClick={onResume} testId="pause-resume" />
          <PauseButton label="Settings" onClick={onOpenSettings} testId="pause-settings" />
          <PauseButton
            label="Restart realm · Same seed"
            onClick={onRestartRealm}
            testId="pause-restart"
          />
          <PauseButton
            label="Abandon expedition"
            emphasis="danger"
            onClick={onAbandon}
            testId="pause-abandon"
          />
        </div>
      </div>
    </div>
  );
}

function PauseButton({
  label,
  onClick,
  testId,
  emphasis = "default",
}: {
  label: string;
  onClick: () => void;
  testId: string;
  emphasis?: "primary" | "default" | "danger";
}) {
  const { background, color, border } = PAUSE_STYLES[emphasis];
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      style={{
        padding: "0.7rem 1rem",
        background,
        color,
        border,
        borderRadius: 10,
        fontSize: 13,
        letterSpacing: 0.2,
        textTransform: "uppercase",
        fontWeight: 900,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {label}
    </button>
  );
}

const PAUSE_STYLES = {
  primary: {
    background: "linear-gradient(135deg, #a3e635, #38bdf8)",
    color: "#071012",
    border: "none",
  },
  default: {
    background: "rgba(15, 23, 42, 0.7)",
    color: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.35)",
  },
  danger: {
    background: "transparent",
    color: "#fca5a5",
    border: "1px solid rgba(252, 165, 165, 0.45)",
  },
} as const;
