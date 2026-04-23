import type { CSSProperties } from "react";

interface RealmLandingProps {
  onStart: () => void;
}

const REALM_FEATURES = [
  {
    label: "Climb",
    title: "Vertical worlds",
    body: "Each ascent is a compact 3D platforming space built from a different realm archetype.",
  },
  {
    label: "Scan",
    title: "Signal anomalies",
    body: "Reach strange voxel artifacts, stabilize their signal, and unlock the extraction gate.",
  },
  {
    label: "Extract",
    title: "Beat collapse",
    body: "Move with intent. Hazards and time pressure push the realm toward instability.",
  },
] as const;

const REALM_METRICS = [
  ["5", "realm biomes"],
  ["3", "capture moments"],
  ["100%", "route verified"],
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
            <span>Season One</span>
            <span>Signal Ascent</span>
          </div>
          <p className="realm-landing__brand">Voxel Realms</p>
          <h1 id="realm-landing-title">Climb worlds that should not touch.</h1>
          <p className="realm-landing__lead">
            A voxel platforming expedition through stacked, unstable realms. Read the route, scan
            the signal, reach the gate, and extract before the climb collapses.
          </p>

          <div className="realm-landing__actions">
            <button className="realm-landing__start" type="button" onClick={onStart}>
              <span>Enter Realm</span>
              <span aria-hidden="true">Start ascent</span>
            </button>
            <div className="realm-landing__status" role="status">
              <span />
              Browser playtest ready
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
