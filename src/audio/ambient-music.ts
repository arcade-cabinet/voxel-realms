/**
 * Ambient music bed (P6.2). Pure procedural Web Audio — zero bundled
 * audio. Each realm archetype gets a distinct two-oscillator drone
 * with gentle detune and a slow LFO-driven filter sweep. The bed
 * runs as long as `playAmbientForArchetype` has been called most
 * recently with a valid id; `stopAmbient` tears it down.
 *
 * Design rules:
 *  - Respects the same `audioEnabled` preference as SFX. Reads through
 *    its own 5-second preference cache so a flurry of phase changes
 *    doesn't hammer persistence.
 *  - Honors `prefers-reduced-motion` — if the user opted into reduced
 *    motion, the LFO filter sweep is disabled (still audible but
 *    steady, not oscillating).
 *  - No AudioContext is created until the first actual playback, so
 *    cold landing never hits an autoplay warning.
 *  - Safe to call under the browser test harness — the
 *    `__VOXEL_REALMS_TEST__` flag short-circuits so Playwright /
 *    Vitest Browser never spin up an oscillator graph.
 */

import { loadRealmPreferences } from "@platform";

type AmbientArchetypeId = "jungle" | "ocean" | "steampunk" | "dinosaur" | "arctic";

interface AmbientVoice {
  rootHz: number;
  fifthHz: number;
  filterBaseHz: number;
  filterSweepHz: number;
  detuneCents: number;
  volume: number;
  oscA: OscillatorType;
  oscB: OscillatorType;
}

const VOICES: Record<AmbientArchetypeId, AmbientVoice> = {
  jungle: {
    rootHz: 110,
    fifthHz: 165,
    filterBaseHz: 520,
    filterSweepHz: 240,
    detuneCents: 6,
    volume: 0.06,
    oscA: "sine",
    oscB: "triangle",
  },
  ocean: {
    rootHz: 98,
    fifthHz: 147,
    filterBaseHz: 480,
    filterSweepHz: 320,
    detuneCents: 9,
    volume: 0.055,
    oscA: "sine",
    oscB: "sine",
  },
  steampunk: {
    rootHz: 92,
    fifthHz: 138,
    filterBaseHz: 440,
    filterSweepHz: 180,
    detuneCents: 11,
    volume: 0.055,
    oscA: "sawtooth",
    oscB: "triangle",
  },
  dinosaur: {
    rootHz: 82,
    fifthHz: 123,
    filterBaseHz: 380,
    filterSweepHz: 160,
    detuneCents: 14,
    volume: 0.07,
    oscA: "sawtooth",
    oscB: "sine",
  },
  arctic: {
    rootHz: 123,
    fifthHz: 185,
    filterBaseHz: 640,
    filterSweepHz: 300,
    detuneCents: 5,
    volume: 0.05,
    oscA: "triangle",
    oscB: "sine",
  },
};

interface AmbientGraph {
  archetype: AmbientArchetypeId;
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  filter: BiquadFilterNode;
  lfo: OscillatorNode | null;
  lfoDepth: GainNode | null;
  envelope: GainNode;
}

const FADE_IN_MS = 1_200;
const FADE_OUT_MS = 640;
const CACHE_TTL_MS = 5_000;

let audioContext: AudioContext | null = null;
let ambientBus: GainNode | null = null;
let active: AmbientGraph | null = null;
let audioEnabledCache: { value: boolean; expiresAt: number } | null = null;

function isTestRun(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as unknown as { __VOXEL_REALMS_TEST__?: boolean }).__VOXEL_REALMS_TEST__ === true
  );
}

function ensureAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (audioContext) return audioContext;
  try {
    audioContext = new Ctor();
    ambientBus = audioContext.createGain();
    ambientBus.gain.value = 0.65;
    ambientBus.connect(audioContext.destination);
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

function isReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function invalidateAmbientPreferencesCache(): void {
  audioEnabledCache = null;
}

export async function playAmbientForArchetype(archetype: string): Promise<void> {
  if (isTestRun()) return;
  const voice = VOICES[archetype as AmbientArchetypeId];
  if (!voice) return;

  if (active?.archetype === archetype) return;

  const enabled = await isAudioEnabled();
  if (!enabled) {
    stopAmbient();
    return;
  }

  const ctx = ensureAudioContext();
  if (!ctx || !ambientBus) return;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => undefined);
    }
  } catch {
    return;
  }

  stopAmbient();

  try {
    const oscA = ctx.createOscillator();
    oscA.type = voice.oscA;
    oscA.frequency.value = voice.rootHz;
    oscA.detune.value = -voice.detuneCents;

    const oscB = ctx.createOscillator();
    oscB.type = voice.oscB;
    oscB.frequency.value = voice.fifthHz;
    oscB.detune.value = voice.detuneCents;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.7;
    filter.frequency.value = voice.filterBaseHz;

    const envelope = ctx.createGain();
    const now = ctx.currentTime;
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(voice.volume, now + FADE_IN_MS / 1_000);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(envelope);
    envelope.connect(ambientBus);

    let lfo: OscillatorNode | null = null;
    let lfoDepth: GainNode | null = null;
    if (!isReducedMotion()) {
      lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.13;
      lfoDepth = ctx.createGain();
      lfoDepth.gain.value = voice.filterSweepHz;
      lfo.connect(lfoDepth);
      lfoDepth.connect(filter.frequency);
      lfo.start(now);
    }

    oscA.start(now);
    oscB.start(now);

    active = {
      archetype: archetype as AmbientArchetypeId,
      oscA,
      oscB,
      filter,
      lfo,
      lfoDepth,
      envelope,
    };
  } catch {
    stopAmbient();
  }
}

export function stopAmbient(): void {
  if (!active || !audioContext) return;

  const graph = active;
  active = null;
  const now = audioContext.currentTime;

  try {
    graph.envelope.gain.cancelScheduledValues(now);
    graph.envelope.gain.setValueAtTime(graph.envelope.gain.value, now);
    graph.envelope.gain.exponentialRampToValueAtTime(0.0001, now + FADE_OUT_MS / 1_000);
  } catch {
    // ignore ramp errors
  }

  const stopAt = now + FADE_OUT_MS / 1_000 + 0.05;
  try {
    graph.oscA.stop(stopAt);
    graph.oscB.stop(stopAt);
    if (graph.lfo) graph.lfo.stop(stopAt);
  } catch {
    // Node may already be stopped.
  }

  const disconnectLater = () => {
    try {
      graph.oscA.disconnect();
      graph.oscB.disconnect();
      graph.filter.disconnect();
      graph.envelope.disconnect();
      if (graph.lfo) graph.lfo.disconnect();
      if (graph.lfoDepth) graph.lfoDepth.disconnect();
    } catch {
      // already torn down
    }
  };
  graph.oscA.onended = disconnectLater;
}

export function disposeAmbientForTests(): void {
  if (active && audioContext) {
    try {
      active.oscA.stop();
      active.oscB.stop();
      if (active.lfo) active.lfo.stop();
    } catch {
      // ignore
    }
    active = null;
  }
  if (audioContext) {
    audioContext.close().catch(() => undefined);
  }
  audioContext = null;
  ambientBus = null;
  audioEnabledCache = null;
}

export const AMBIENT_ARCHETYPE_IDS: AmbientArchetypeId[] = [
  "jungle",
  "ocean",
  "steampunk",
  "dinosaur",
  "arctic",
];
