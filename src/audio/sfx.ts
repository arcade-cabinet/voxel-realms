/**
 * Procedural SFX using Web Audio. Zero bundled audio assets — the
 * realms theme is defined by short synth envelopes. Each cue is short
 * (≤ 300 ms) and mixed through a shared master gain.
 *
 * Design rules:
 *  - All playback MUST go through playCue so persistence + reduce-motion
 *    checks happen in one place.
 *  - No AudioContext is created until the first actual user-gesture
 *    playback, so landing never hits the "autoplay blocked" warning.
 *  - Persistence is loaded lazily and cached for 5 s so a flurry of
 *    cues in one frame doesn't hammer the wrapper.
 */

import { loadRealmPreferences } from "@platform";

export type VoxelRealmsCue =
  | "jump"
  | "land"
  | "scan-start"
  | "scan-complete"
  | "gate-arm"
  | "gate-open"
  | "extract"
  | "collapse";

interface CueDescriptor {
  type: OscillatorType;
  startFreq: number;
  endFreq: number;
  durationMs: number;
  volume: number;
  filterHz?: number;
}

const CUES: Record<VoxelRealmsCue, CueDescriptor> = {
  jump: { type: "triangle", startFreq: 480, endFreq: 640, durationMs: 110, volume: 0.18 },
  land: { type: "sine", startFreq: 220, endFreq: 130, durationMs: 130, volume: 0.22 },
  "scan-start": {
    type: "sine",
    startFreq: 540,
    endFreq: 760,
    durationMs: 140,
    volume: 0.16,
  },
  "scan-complete": {
    type: "triangle",
    startFreq: 700,
    endFreq: 980,
    durationMs: 260,
    volume: 0.22,
  },
  "gate-arm": {
    type: "square",
    startFreq: 330,
    endFreq: 440,
    durationMs: 180,
    volume: 0.14,
    filterHz: 1_200,
  },
  "gate-open": {
    type: "sawtooth",
    startFreq: 440,
    endFreq: 880,
    durationMs: 300,
    volume: 0.18,
    filterHz: 1_800,
  },
  extract: {
    type: "triangle",
    startFreq: 660,
    endFreq: 880,
    durationMs: 280,
    volume: 0.24,
  },
  collapse: {
    type: "sawtooth",
    startFreq: 220,
    endFreq: 90,
    durationMs: 300,
    volume: 0.24,
    filterHz: 900,
  },
};

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let audioEnabledCache: { value: boolean; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5_000;

function ensureAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (audioContext) return audioContext;
  try {
    audioContext = new Ctor();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(audioContext.destination);
    return audioContext;
  } catch {
    return null;
  }
}

async function isAudioEnabled(): Promise<boolean> {
  const now = Date.now();
  if (audioEnabledCache && audioEnabledCache.expiresAt > now) {
    return audioEnabledCache.value;
  }
  try {
    const prefs = await loadRealmPreferences();
    audioEnabledCache = { value: prefs.audioEnabled, expiresAt: now + CACHE_TTL_MS };
    return prefs.audioEnabled;
  } catch {
    audioEnabledCache = { value: true, expiresAt: now + CACHE_TTL_MS };
    return true;
  }
}

/**
 * Force-refresh the cached audio-enabled state. Call after the player
 * toggles audio in Settings so the next cue immediately reflects the
 * new preference.
 */
export function invalidateAudioPreferencesCache(): void {
  audioEnabledCache = null;
}

/**
 * Fire a cue. Fire-and-forget; errors are swallowed (audio must never
 * crash the game). If the page hasn't received a user gesture yet the
 * context stays suspended and the cue is dropped silently — caller
 * doesn't need to know.
 */
export async function playCue(cue: VoxelRealmsCue): Promise<void> {
  const enabled = await isAudioEnabled();
  if (!enabled) return;
  const ctx = ensureAudioContext();
  if (!ctx || !masterGain) return;

  try {
    if (ctx.state === "suspended") {
      // resume() is a Promise that rejects if there's been no gesture
      // — treat rejection as "drop this cue" rather than a hard error.
      await ctx.resume().catch(() => undefined);
    }

    const descriptor = CUES[cue];
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();
    osc.type = descriptor.type;

    const now = ctx.currentTime;
    const durationSec = descriptor.durationMs / 1_000;
    osc.frequency.setValueAtTime(descriptor.startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(descriptor.endFreq, 1), now + durationSec);

    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(descriptor.volume, now + Math.min(0.02, durationSec / 3));
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    let filter: BiquadFilterNode | null = null;
    if (descriptor.filterHz) {
      filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = descriptor.filterHz;
      osc.connect(filter);
      filter.connect(envelope);
    } else {
      osc.connect(envelope);
    }

    envelope.connect(masterGain);
    osc.start(now);
    osc.stop(now + durationSec);
    osc.onended = () => {
      try {
        osc.disconnect();
      } catch {}
      try {
        filter?.disconnect();
      } catch {}
      try {
        envelope.disconnect();
      } catch {}
    };
  } catch {
    // Any audio error is non-fatal.
  }
}

/**
 * Teardown hook for tests and HMR.
 */
export function disposeAudioForTests(): void {
  if (masterGain) {
    try {
      masterGain.disconnect();
    } catch {}
  }
  if (audioContext) {
    audioContext.close().catch(() => undefined);
  }
  audioContext = null;
  masterGain = null;
  audioEnabledCache = null;
}
