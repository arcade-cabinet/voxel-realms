import type { RealmHazardKind } from "@world/climber";

export interface RealmHazardDescriptor {
  /** Short player-facing noun phrase surfaced in the HUD ("pressure pulse"). */
  label: string;
  /** Imperative sentence for the coach / tooltips ("Mind the pressure pulse — move after the hiss."). */
  advice: string;
  /** Single word for terse surfaces ("pulse", "surge"). */
  shortLabel: string;
}

const HAZARD_VOCABULARY: Record<RealmHazardKind, RealmHazardDescriptor> = {
  thorns: {
    label: "thorn snare",
    shortLabel: "snare",
    advice: "Mind the thorn snare — stay left of the vines.",
  },
  tide: {
    label: "tide surge",
    shortLabel: "surge",
    advice: "Mind the tide surge — ride the crest, do not fight it.",
  },
  steam: {
    label: "pressure pulse",
    shortLabel: "pulse",
    advice: "Mind the pressure pulse — move on the hiss, not the silence.",
  },
  stampede: {
    label: "stampede lane",
    shortLabel: "lane",
    advice: "Mind the stampede lane — cross between the heavy silhouettes.",
  },
  wind: {
    label: "wind gust",
    shortLabel: "gust",
    advice: "Mind the wind gust — launch off the drop, not the peak.",
  },
  ice: {
    label: "ice slick",
    shortLabel: "slick",
    advice: "Mind the ice slick — commit before the slide takes over.",
  },
};

export function describeRealmHazard(kind: RealmHazardKind): RealmHazardDescriptor {
  return HAZARD_VOCABULARY[kind];
}

export function realmHazardLabel(kind: RealmHazardKind): string {
  return HAZARD_VOCABULARY[kind].label;
}

export function realmHazardAdvice(kind: RealmHazardKind): string {
  return HAZARD_VOCABULARY[kind].advice;
}

export const REALM_HAZARD_KINDS: RealmHazardKind[] = [
  "thorns",
  "tide",
  "steam",
  "stampede",
  "wind",
  "ice",
];
