import { playAmbientForArchetype, stopAmbient } from "@app/shared/audio/ambientMusic";
import { playCue } from "@app/shared/audio/sfx";
import { fireHaptic } from "@app/shared/platform/haptics";
import { summarizeRealmExitGate } from "@world/exit-gate";
import { RealmTrait, VoxelTrait } from "@store/traits";
import { voxelEntity } from "@store/world";
import { useTrait } from "koota/react";
import { useEffect, useRef } from "react";

/**
 * Rendered only while state.phase === "playing". Subscribes to a
 * handful of state transitions and fires synthesized SFX cues. All
 * logic is effect-only (no DOM / no R3F) so the component is safe to
 * mount alongside HUD without affecting layout or input.
 *
 * Cues fire on rising edges — we track the last value we saw in a ref
 * and only play the cue when the value crosses a threshold.
 */
export function AudioBindings() {
  const state = useTrait(voxelEntity, VoxelTrait);
  const realm = useTrait(voxelEntity, RealmTrait);

  const lastScanCount = useRef(realm.discoveredAnomalies.length);
  const lastGateState = useRef<string | null>(null);
  const lastExtractionState = useRef(realm.extractionState);
  const lastJumpCount = useRef<number | null>(null);

  const gate = summarizeRealmExitGate({
    discoveredAnomalyCount: realm.discoveredAnomalies.length,
    extractionState: realm.extractionState,
    instabilityLevel: realm.instabilityLevel,
    accent: realm.activeRealm.archetype.accent,
  });

  // New anomaly scanned.
  useEffect(() => {
    if (realm.discoveredAnomalies.length > lastScanCount.current) {
      void playCue("scan-complete");
      void fireHaptic("scan-complete");
    }
    lastScanCount.current = realm.discoveredAnomalies.length;
  }, [realm.discoveredAnomalies.length]);

  // Gate state transition: locked → primed (arm), primed → open (open),
  // anything → collapsed (muted via collapse cue).
  useEffect(() => {
    const previous = lastGateState.current;
    if (previous !== gate.state) {
      if (previous === "locked" && gate.state === "primed") {
        void playCue("gate-arm");
      } else if (previous === "primed" && gate.state === "open") {
        void playCue("gate-open");
      }
    }
    lastGateState.current = gate.state;
  }, [gate.state]);

  // Extraction / collapse transitions.
  useEffect(() => {
    const previous = lastExtractionState.current;
    if (previous !== realm.extractionState) {
      if (realm.extractionState === "extracted") {
        void playCue("extract");
        void fireHaptic("extract");
      } else if (realm.extractionState === "collapsed") {
        void playCue("collapse");
        void fireHaptic("collapse");
      }
    }
    lastExtractionState.current = realm.extractionState;
  }, [realm.extractionState]);

  // Jump cue — fires on every voxel:jump event.
  useEffect(() => {
    const handleJump = () => {
      lastJumpCount.current = (lastJumpCount.current ?? 0) + 1;
      void playCue("jump");
      void fireHaptic("jump-land");
    };
    window.addEventListener("voxel:jump", handleJump);
    return () => window.removeEventListener("voxel:jump", handleJump);
  }, []);

  // Ambient music bed — switches when the realm archetype changes and
  // stops when the scene unmounts (phase !== "playing" unmounts this
  // component).
  useEffect(() => {
    void playAmbientForArchetype(realm.activeRealm.archetype.id);
    return () => stopAmbient();
  }, [realm.activeRealm.archetype.id]);

  // Reference state.phase only to keep the linter happy about the
  // koota subscription — the effects above already drive their own
  // re-runs when relevant state changes.
  void state.phase;

  return null;
}
