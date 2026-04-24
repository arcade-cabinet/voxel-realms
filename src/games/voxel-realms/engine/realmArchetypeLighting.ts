import type { RealmArchetypeId } from "./realmClimber";

/**
 * Per-archetype lighting descriptor (P4.4). Pure data — the R3F
 * scene (World.tsx) can consume these when the lighting rework
 * lands without needing to rebuild the deterministic engine tests.
 * Values are tuned to match the archetype's `accent` / `platformColor`
 * from REALM_ARCHETYPES in `realmClimber.ts`.
 *
 * Expected shape of the integration:
 *   const light = describeRealmArchetypeLighting(realm.archetype.id);
 *   <ambientLight color={light.ambient.color} intensity={light.ambient.intensity} />
 *   <directionalLight color={light.sun.color} intensity={light.sun.intensity}
 *     position={light.sun.position} />
 *   <hemisphereLight args={[light.hemisphere.sky, light.hemisphere.ground,
 *     light.hemisphere.intensity]} />
 *   <fog attach="fog" args={[light.fog.color, light.fog.near, light.fog.far]} />
 */

export interface RealmLightColor {
  color: string;
  intensity: number;
}

export interface RealmLightSun extends RealmLightColor {
  position: readonly [number, number, number];
}

export interface RealmLightHemisphere {
  sky: string;
  ground: string;
  intensity: number;
}

export interface RealmLightFog {
  color: string;
  near: number;
  far: number;
}

export interface RealmArchetypeLighting {
  archetype: RealmArchetypeId;
  ambient: RealmLightColor;
  sun: RealmLightSun;
  hemisphere: RealmLightHemisphere;
  fog: RealmLightFog;
  /** Hex for scene `<color attach="background">` so sky reads archetype-correct. */
  backgroundColor: string;
}

const ARCHETYPE_LIGHTING: Record<RealmArchetypeId, RealmArchetypeLighting> = {
  jungle: {
    archetype: "jungle",
    ambient: { color: "#e4f7d2", intensity: 0.38 },
    sun: { color: "#d4f5a3", intensity: 1.55, position: [-46, 82, -60] },
    hemisphere: { sky: "#d2f2a4", ground: "#2b4f21", intensity: 0.42 },
    fog: { color: "#8fbf6a", near: 22, far: 112 },
    backgroundColor: "#9ecf7f",
  },
  ocean: {
    archetype: "ocean",
    ambient: { color: "#dff7ff", intensity: 0.48 },
    sun: { color: "#c9eaff", intensity: 1.52, position: [-54, 88, -72] },
    hemisphere: { sky: "#bde8ff", ground: "#123b55", intensity: 0.44 },
    fog: { color: "#a8dced", near: 26, far: 118 },
    backgroundColor: "#8ecfe7",
  },
  steampunk: {
    archetype: "steampunk",
    ambient: { color: "#f4e0b8", intensity: 0.32 },
    sun: { color: "#ffd38a", intensity: 1.48, position: [-40, 72, -54] },
    hemisphere: { sky: "#f0c87a", ground: "#3a2411", intensity: 0.36 },
    fog: { color: "#b89368", near: 20, far: 98 },
    backgroundColor: "#caa26a",
  },
  dinosaur: {
    archetype: "dinosaur",
    ambient: { color: "#f0e6c4", intensity: 0.35 },
    sun: { color: "#ffe18a", intensity: 1.6, position: [-58, 90, -62] },
    hemisphere: { sky: "#e8d98a", ground: "#4a3517", intensity: 0.4 },
    fog: { color: "#b59358", near: 22, far: 108 },
    backgroundColor: "#d4b86a",
  },
  arctic: {
    archetype: "arctic",
    ambient: { color: "#eaf6ff", intensity: 0.55 },
    sun: { color: "#f6fbff", intensity: 1.38, position: [-62, 96, -80] },
    hemisphere: { sky: "#e4f1ff", ground: "#788ea0", intensity: 0.5 },
    fog: { color: "#c4d8e8", near: 30, far: 132 },
    backgroundColor: "#b9d3e4",
  },
};

export function describeRealmArchetypeLighting(
  archetype: RealmArchetypeId
): RealmArchetypeLighting {
  return ARCHETYPE_LIGHTING[archetype];
}

export const REALM_LIGHTING_ARCHETYPES: RealmArchetypeId[] = [
  "jungle",
  "ocean",
  "steampunk",
  "dinosaur",
  "arctic",
];
