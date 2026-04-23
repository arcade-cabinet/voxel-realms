import type { CSSProperties } from "react";

interface RealmLandingProps {
  onStart: () => void;
}

const REALM_FEATURES = [
  {
    label: "Climb",
    title: "Read the route",
    body: "Each realm is a finite vertical climb. Follow the beacon — jumps, drops, and ledges are all readable from eye level.",
  },
  {
    label: "Scan",
    title: "Stabilize the mesh",
    body: "Dwell on anomaly signals to stabilize the gate. At least one scan per realm.",
  },
  {
    label: "Extract",
    title: "Before it falls",
    body: "The realm collapses on a timer. Reach the exit gate before instability takes the spire down.",
  },
] as const;

const REALM_METRICS = [
  ["5", "biome archetypes"],
  ["1", "minute per climb"],
  ["∞", "expedition sequence"],
] as const;

const VOXEL_PARTICLES = Array.from({ length: 18 }, (_, index) => ({
  id: `landing-voxel-${index + 1}`,
  index,
}));

export function RealmLanding({ onStart }: RealmLandingProps) {
  return (
    <div className="realm-landing" data-testid="start-screen">
      <div aria-hidden="true" className="realm-landing__shader" />
      <div aria-hidden="true" className="realm-landing__grid" />
      <div aria-hidden="true" className="realm-landing__voxels">
        {VOXEL_PARTICLES.map((particle) => (
          <span key={particle.id} style={{ "--voxel-index": particle.index } as CSSProperties} />
        ))}
      </div>

      <section className="realm-landing__panel" aria-labelledby="realm-landing-title">
        <div className="realm-landing__copy">
          <div className="realm-landing__eyebrow">
            <span>Expedition log</span>
            <span>Surveyor protocol v1.0</span>
          </div>
          <p className="realm-landing__brand">Voxel Realms</p>
          <h1 id="realm-landing-title">
            Climb the spire. Scan the signals. Extract before it falls.
          </h1>
          <p className="realm-landing__lead">
            A finite, seeded realm climber. Jungle, ocean, steampunk, dinosaur, arctic — each realm
            is a vertical expedition you can read from eye level, and extract from before
            instability collapses the climb.
          </p>

          <div className="realm-landing__actions">
            <button
              className="realm-landing__start"
              type="button"
              onClick={onStart}
              data-testid="realm-landing-start"
            >
              <span>Enter Realm</span>
              <span aria-hidden="true">Begin expedition</span>
            </button>
            <div className="realm-landing__status" role="status">
              <span />
              Playtest build — mobile-first
            </div>
          </div>
        </div>

        <aside className="realm-landing__intel" aria-label="Realm briefing">
          <div className="realm-landing__beacon">
            <div aria-hidden="true" className="realm-landing__beacon-core" />
            <div>
              <span>Beacon route</span>
              <strong>Start, signal, goal</strong>
            </div>
          </div>

          <div className="realm-landing__metrics">
            {REALM_METRICS.map(([value, label]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="realm-landing__feature-grid">
            {REALM_FEATURES.map((feature) => (
              <article key={feature.label}>
                <span>{feature.label}</span>
                <strong>{feature.title}</strong>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
