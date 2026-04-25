import { loadRealmPreferences, type RealmExpeditionRecord } from "@platform";
import { useEffect, useState } from "react";

interface ExpeditionSummaryCardProps {
  /** When true, force-load from persistence even if already loaded. */
  reloadToken?: number;
}

interface Loaded {
  best: RealmExpeditionRecord | null;
  last: RealmExpeditionRecord | null;
}

export function ExpeditionSummaryCard({ reloadToken = 0 }: ExpeditionSummaryCardProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    // reloadToken is a sentinel — changing it re-runs the effect. Consume
    // it so biome's useExhaustiveDependencies rule accepts the dep.
    void reloadToken;

    let cancelled = false;
    (async () => {
      try {
        const prefs = await loadRealmPreferences();
        if (!cancelled) {
          setLoaded({ best: prefs.bestExpedition, last: prefs.lastExpedition });
        }
      } catch {
        if (!cancelled) setLoaded({ best: null, last: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  if (!loaded) return null;
  if (!loaded.best && !loaded.last) return null;

  return (
    <div
      data-testid="expedition-summary-card"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        padding: "0.7rem 0.9rem",
        marginBottom: "0.75rem",
        border: "1px solid rgba(56, 189, 248, 0.35)",
        background: "rgba(8, 20, 24, 0.55)",
        borderRadius: 10,
        color: "#f8fafc",
      }}
    >
      <Stat title="Best expedition" record={loaded.best} accent="#a3e635" />
      <Stat title="Last expedition" record={loaded.last} accent="#7dd3fc" />
    </div>
  );
}

function Stat({
  title,
  record,
  accent,
}: {
  title: string;
  record: RealmExpeditionRecord | null;
  accent: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: 0.35,
          textTransform: "uppercase",
          color: "#94a3b8",
          fontWeight: 800,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: accent,
          lineHeight: 1.1,
          marginTop: 2,
        }}
      >
        {record ? record.score.toLocaleString() : "—"}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#cbd5e1",
          letterSpacing: 0.2,
          marginTop: 2,
          textTransform: "uppercase",
        }}
      >
        {record
          ? `${record.rankLabel} · ${record.totalSignals} signals · ${record.extractedCount}/${record.completedCount} extracted`
          : "No expeditions yet"}
      </div>
    </div>
  );
}
