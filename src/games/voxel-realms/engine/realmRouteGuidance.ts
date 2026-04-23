import type {
  RealmClimb,
  RealmHazard,
  RealmPlatform,
  RealmRouteLink,
  RealmRouteMove,
} from "./realmClimber";

export type RealmRouteGuidanceState = "route" | "exit";

export interface RealmRouteGuidance {
  state: RealmRouteGuidanceState;
  pathIndex: number;
  currentPlatformId: string | null;
  nextPlatformId: string | null;
  nextPlatform: RealmPlatform | null;
  activeLink: RealmRouteLink | null;
  activeHazard: RealmHazard | null;
  move: RealmRouteMove | "exit";
  label: string;
  detail: string;
  hazardLabel: string | null;
}

export function summarizeRealmRouteGuidance(
  realm: RealmClimb,
  pathIndex: number
): RealmRouteGuidance {
  const normalizedPathIndex = clampInt(pathIndex, 0, Math.max(0, realm.goldenPath.length - 1));
  const currentPlatformId = realm.goldenPath[normalizedPathIndex] ?? null;
  const nextPlatformId = realm.goldenPath[normalizedPathIndex + 1] ?? null;
  const platformById = new Map(realm.platforms.map((platform) => [platform.id, platform]));

  if (!currentPlatformId || !nextPlatformId) {
    return {
      state: "exit",
      pathIndex: normalizedPathIndex,
      currentPlatformId,
      nextPlatformId: null,
      nextPlatform: platformById.get(realm.exitPlatformId) ?? null,
      activeLink: null,
      activeHazard: null,
      move: "exit",
      label: "Exit gate",
      detail: "Confirm signal and step through the gate.",
      hazardLabel: null,
    };
  }

  const activeLink =
    realm.links.find((link) => link.from === currentPlatformId && link.to === nextPlatformId) ??
    null;
  const activeHazard = activeLink
    ? (realm.hazards.find(
        (hazard) => hazard.between[0] === activeLink.from && hazard.between[1] === activeLink.to
      ) ?? null)
    : null;
  const move = activeLink?.move ?? "walk";

  return {
    state: "route",
    pathIndex: normalizedPathIndex,
    currentPlatformId,
    nextPlatformId,
    nextPlatform: platformById.get(nextPlatformId) ?? null,
    activeLink,
    activeHazard,
    move,
    label: formatMoveLabel(move),
    detail: activeLink
      ? formatLinkDetail(activeLink, activeHazard)
      : "Find the next validated platform.",
    hazardLabel: activeHazard ? `${activeHazard.kind} lane` : null,
  };
}

function formatMoveLabel(move: RealmRouteMove) {
  if (move === "jump") {
    return "Next jump";
  }

  if (move === "climb") {
    return "Next climb";
  }

  if (move === "drop") {
    return "Next drop";
  }

  return "Next walk";
}

function formatLinkDetail(link: RealmRouteLink, hazard: RealmHazard | null) {
  const gap = `${link.horizontalGap.toFixed(1)}m gap`;
  const vertical = Math.abs(link.verticalDelta) < 0.1 ? "level" : `${signed(link.verticalDelta)}m`;
  const hazardLabel = hazard ? ` / ${hazard.kind} hazard` : "";

  return `${gap} / ${vertical}${hazardLabel}`;
}

function signed(value: number) {
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
