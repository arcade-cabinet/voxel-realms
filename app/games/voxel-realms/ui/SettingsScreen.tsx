import { invalidateAmbientPreferencesCache, stopAmbient } from "@app/shared/audio/ambientMusic";
import { invalidateAudioPreferencesCache } from "@app/shared/audio/sfx";
import { invalidateHapticsPreferencesCache } from "@app/shared/platform/haptics";
import {
  DEFAULT_REALM_PREFERENCES,
  loadRealmPreferences,
  type RealmPlayerPreferences,
  updateRealmPreferences,
} from "@app/shared/platform/persistence/preferences";
import { disableErrorTelemetry, enableErrorTelemetry } from "@app/shared/telemetry/errors";
import { useEffect, useState } from "react";

interface SettingsScreenProps {
  onClose: () => void;
  /**
   * Called when the player asks to replay the tutorial. The parent is
   * expected to clear `onboardingSeen` and dismiss the settings screen.
   */
  onReplayTutorial?: () => void;
}

type SettingsFlags = Pick<
  RealmPlayerPreferences,
  "audioEnabled" | "motionReduced" | "hapticsEnabled" | "telemetryOptIn"
>;

export function SettingsScreen({ onClose, onReplayTutorial }: SettingsScreenProps) {
  const [prefs, setPrefs] = useState<SettingsFlags>({
    audioEnabled: DEFAULT_REALM_PREFERENCES.audioEnabled,
    motionReduced: DEFAULT_REALM_PREFERENCES.motionReduced,
    hapticsEnabled: DEFAULT_REALM_PREFERENCES.hapticsEnabled,
    telemetryOptIn: DEFAULT_REALM_PREFERENCES.telemetryOptIn,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadRealmPreferences();
        if (!cancelled) {
          setPrefs({
            audioEnabled: loaded.audioEnabled,
            motionReduced: loaded.motionReduced,
            hapticsEnabled: loaded.hapticsEnabled,
            telemetryOptIn: loaded.telemetryOptIn,
          });
          if (loaded.telemetryOptIn) {
            enableErrorTelemetry();
          } else {
            disableErrorTelemetry();
          }
        }
      } catch {
        // Fall back to defaults on storage failure.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (key: keyof SettingsFlags) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    if (key === "audioEnabled") {
      invalidateAudioPreferencesCache();
      invalidateAmbientPreferencesCache();
      if (!next.audioEnabled) {
        stopAmbient();
      }
    }
    if (key === "hapticsEnabled") {
      invalidateHapticsPreferencesCache();
    }
    if (key === "telemetryOptIn") {
      if (next.telemetryOptIn) {
        enableErrorTelemetry();
      } else {
        disableErrorTelemetry();
      }
    }
    try {
      await updateRealmPreferences(next);
    } catch {
      // Persistence is best-effort. Toggle state still reflects intent
      // for the current session.
    }
  };

  const handleReplayTutorial = async () => {
    try {
      await updateRealmPreferences({ onboardingSeen: false });
    } catch {
      // Ignore; next-run coach will still fire if storage becomes usable.
    }
    onReplayTutorial?.();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-screen-title"
      data-testid="settings-screen"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(1rem, 4vw, 2.5rem)",
        zIndex: 40,
        background: "rgba(7, 9, 13, 0.78)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          width: "min(100%, 520px)",
          padding: "1.2rem 1.4rem 1.1rem",
          background: "var(--realm-panel-strong, rgba(12, 20, 32, 0.96))",
          border: "1px solid var(--realm-border, rgba(247, 243, 223, 0.22))",
          borderRadius: 14,
          color: "var(--realm-ink, #f7f3df)",
          boxShadow: "0 28px 60px rgba(0, 0, 0, 0.55)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            marginBottom: 8,
          }}
        >
          <h2
            id="settings-screen-title"
            style={{
              fontFamily: "var(--font-display, inherit)",
              fontSize: "clamp(1.2rem, 3vw, 1.55rem)",
              lineHeight: 1.1,
              margin: 0,
              fontWeight: 800,
            }}
          >
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            data-testid="settings-close"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--realm-mist, #aab9bd)",
              fontSize: 14,
              letterSpacing: 0.2,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <p
          style={{
            fontSize: 12,
            color: "var(--realm-mist, #aab9bd)",
            marginTop: 0,
            marginBottom: 14,
            letterSpacing: 0.15,
          }}
        >
          Changes persist across web reloads and native app launches.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Toggle
            label="Audio"
            description="Sound effects and ambient music"
            checked={prefs.audioEnabled}
            onChange={() => toggle("audioEnabled")}
            disabled={!ready}
            testId="settings-toggle-audio"
          />
          <Toggle
            label="Haptics"
            description="Vibration feedback on supported devices"
            checked={prefs.hapticsEnabled}
            onChange={() => toggle("hapticsEnabled")}
            disabled={!ready}
            testId="settings-toggle-haptics"
          />
          <Toggle
            label="Reduce motion"
            description="Dampens screen shake and celebration beats"
            checked={prefs.motionReduced}
            onChange={() => toggle("motionReduced")}
            disabled={!ready}
            testId="settings-toggle-motion"
          />
          <Toggle
            label="Error telemetry"
            description="Anonymous local error log to help diagnose crashes. No data leaves the device yet."
            checked={prefs.telemetryOptIn}
            onChange={() => toggle("telemetryOptIn")}
            disabled={!ready}
            testId="settings-toggle-telemetry"
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginTop: 16,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={handleReplayTutorial}
            data-testid="settings-replay-tutorial"
            style={{
              background: "transparent",
              border: "1px solid rgba(65, 220, 232, 0.55)",
              color: "var(--realm-cyan, #41dce8)",
              padding: "0.5rem 0.95rem",
              borderRadius: 8,
              fontSize: 12,
              letterSpacing: 0.25,
              textTransform: "uppercase",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Replay tutorial
          </button>
          <a
            href="https://github.com/arcade-cabinet/voxel-realms/issues/new?template=feedback.yml"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="settings-send-feedback"
            style={{
              background: "transparent",
              border: "1px solid rgba(188, 255, 92, 0.55)",
              color: "var(--realm-lime, #bcff5c)",
              padding: "0.5rem 0.95rem",
              borderRadius: 8,
              fontSize: 12,
              letterSpacing: 0.25,
              textTransform: "uppercase",
              fontWeight: 800,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Send feedback
          </a>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: "auto",
              background:
                "linear-gradient(135deg, var(--realm-lime, #bcff5c), var(--realm-cyan, #41dce8))",
              color: "var(--realm-void, #07090d)",
              border: 0,
              padding: "0.55rem 1.1rem",
              borderRadius: 8,
              fontWeight: 900,
              letterSpacing: 0.25,
              textTransform: "uppercase",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
  testId,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      data-testid={testId}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        padding: "0.6rem 0.8rem",
        background: "var(--realm-panel, rgba(7, 11, 18, 0.58))",
        border: "1px solid var(--realm-border, rgba(247, 243, 223, 0.18))",
        borderRadius: 10,
        cursor: disabled ? "progress" : "pointer",
        color: "var(--realm-ink, #f7f3df)",
        textAlign: "left",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <div>
        <div style={{ fontWeight: 800, letterSpacing: 0.15 }}>{label}</div>
        <div
          style={{
            fontSize: 11,
            color: "var(--realm-mist, #aab9bd)",
            letterSpacing: 0.1,
            marginTop: 2,
          }}
        >
          {description}
        </div>
      </div>
      <span
        aria-hidden="true"
        style={{
          width: 40,
          height: 22,
          borderRadius: 999,
          background: checked
            ? "var(--realm-cyan, #41dce8)"
            : "var(--realm-border, rgba(247, 243, 223, 0.28))",
          position: "relative",
          transition: "background 160ms ease",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 20 : 2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "var(--realm-ink, #f7f3df)",
            transition: "left 160ms ease",
          }}
        />
      </span>
    </button>
  );
}
