import { DEFAULT_REALM_PREFERENCES, loadRealmPreferences, updateRealmPreferences } from "@platform";
import { useEffect, useState } from "react";

interface CoachStep {
  id: "follow" | "scan" | "extract";
  title: string;
  body: string;
}

const COACH_STEPS: readonly CoachStep[] = [
  {
    id: "follow",
    title: "Follow the beacon",
    body: "Each realm is a climb. Read the route from eye level — jumps, drops, and ledges are all readable from where you stand.",
  },
  {
    id: "scan",
    title: "Stabilize the mesh",
    body: "Dwell on anomaly signals to stabilize the exit gate. At least one scan per realm, more is better.",
  },
  {
    id: "extract",
    title: "Before it falls",
    body: "The gate opens when the signal mesh holds. Reach it before instability collapses the spire.",
  },
] as const;

interface FirstRunCoachProps {
  onDismiss?: () => void;
  /**
   * When true, skip the persisted-state check and show the coach.
   * Used by tests and by the settings "replay tutorial" flow.
   */
  forceShow?: boolean;
}

export function FirstRunCoach({ onDismiss, forceShow = false }: FirstRunCoachProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (forceShow) {
      setVisible(true);
      return;
    }

    (async () => {
      try {
        const prefs = await loadRealmPreferences();
        if (!cancelled && !prefs.onboardingSeen) {
          setVisible(true);
        }
      } catch {
        if (!cancelled && !DEFAULT_REALM_PREFERENCES.onboardingSeen) {
          setVisible(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [forceShow]);

  if (!visible) return null;

  const current = COACH_STEPS[step];
  if (!current) return null;

  const isLast = step === COACH_STEPS.length - 1;

  const dismiss = async (persist: boolean) => {
    setVisible(false);
    if (persist) {
      try {
        await updateRealmPreferences({ onboardingSeen: true });
      } catch {
        // Best-effort. Tutorial can reappear if storage is unavailable.
      }
    }
    onDismiss?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-run-coach-title"
      data-testid="first-run-coach"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "clamp(1rem, 4vw, 2.5rem)",
        pointerEvents: "auto",
        zIndex: 30,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 70%, rgba(7, 16, 18, 0.12), rgba(7, 16, 18, 0.55))",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />
      <div
        style={{
          position: "relative",
          width: "min(100%, 560px)",
          background: "rgba(8, 20, 24, 0.92)",
          border: "1px solid rgba(56, 189, 248, 0.45)",
          borderRadius: 14,
          padding: "clamp(1rem, 2.4vw, 1.4rem)",
          color: "#f8fafc",
          boxShadow: "0 26px 52px rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 11,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              color: "#7dd3fc",
              fontWeight: 800,
            }}
          >
            Surveyor brief · {step + 1} / {COACH_STEPS.length}
          </span>
          <button
            type="button"
            onClick={() => dismiss(true)}
            aria-label="Skip tutorial"
            data-testid="first-run-coach-skip"
            style={{
              background: "transparent",
              border: "none",
              color: "#cbd5e1",
              fontSize: 11,
              letterSpacing: 0.2,
              textTransform: "uppercase",
              cursor: "pointer",
              padding: "0.25rem 0.4rem",
            }}
          >
            Skip
          </button>
        </div>

        <h2
          id="first-run-coach-title"
          style={{
            fontFamily: "var(--font-display, inherit)",
            fontSize: "clamp(1.2rem, 3.2vw, 1.6rem)",
            lineHeight: 1.1,
            margin: 0,
            color: "#f8fafc",
          }}
        >
          {current.title}
        </h2>
        <p
          style={{
            color: "#cbd5e1",
            fontSize: "clamp(0.88rem, 2vw, 0.98rem)",
            lineHeight: 1.45,
            marginTop: 8,
            marginBottom: 0,
          }}
        >
          {current.body}
        </p>

        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            marginTop: 14,
          }}
          aria-hidden="true"
        >
          {COACH_STEPS.map((dot, index) => (
            <span
              key={dot.id}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background:
                  index === step
                    ? "#38bdf8"
                    : index < step
                      ? "rgba(56, 189, 248, 0.55)"
                      : "rgba(148, 163, 184, 0.3)",
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.6rem",
            marginTop: 14,
          }}
        >
          {step > 0 ? (
            <button type="button" onClick={() => setStep(step - 1)} style={secondaryButtonStyle}>
              Back
            </button>
          ) : null}
          {isLast ? (
            <button
              type="button"
              onClick={() => dismiss(true)}
              data-testid="first-run-coach-start"
              style={primaryButtonStyle}
            >
              Begin expedition
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              data-testid="first-run-coach-next"
              style={primaryButtonStyle}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #a3e635, #38bdf8)",
  color: "#071012",
  border: 0,
  borderRadius: 10,
  padding: "0.6rem 1.1rem",
  fontWeight: 900,
  letterSpacing: 0.2,
  textTransform: "uppercase",
  fontSize: 13,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "transparent",
  color: "#cbd5e1",
  border: "1px solid rgba(148, 163, 184, 0.4)",
  borderRadius: 10,
  padding: "0.55rem 0.95rem",
  fontWeight: 700,
  letterSpacing: 0.2,
  textTransform: "uppercase",
  fontSize: 12,
  cursor: "pointer",
};
