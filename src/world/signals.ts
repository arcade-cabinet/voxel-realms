export interface RealmSignalFocus {
  distance: number;
  scanRadius: number;
  proximity: number;
  inScanRange: boolean;
  tetherOpacity: number;
  ringScale: number;
}

const SIGNAL_FOCUS_FADE_DISTANCE = 18;

export function summarizeRealmSignalFocus(distance: number, scanRadius: number): RealmSignalFocus {
  const safeDistance = Math.max(0, distance);
  const safeScanRadius = Math.max(0.1, scanRadius);
  const overScanDistance = Math.max(0, safeDistance - safeScanRadius);
  const proximity = clamp(1 - overScanDistance / SIGNAL_FOCUS_FADE_DISTANCE, 0, 1);

  return {
    distance: round(safeDistance, 2),
    scanRadius: round(safeScanRadius, 2),
    proximity: round(proximity, 3),
    inScanRange: safeDistance <= safeScanRadius,
    tetherOpacity: round(0.12 + proximity * 0.48, 3),
    ringScale: round(0.72 + proximity * 0.28, 3),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
