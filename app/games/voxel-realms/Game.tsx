import { browserTestCanvasGlOptions, GameViewport } from "@app/shared";
import { scoreExpeditionFromRealmState } from "@logic/games/voxel-realms/engine/progression";
import { createRealmSequenceEntry } from "@logic/games/voxel-realms/engine/realmSequence";
import { createInitialVoxelState } from "@logic/games/voxel-realms/engine/voxelSimulation";
import {
  createInitialRealmRuntime,
  createNextRealmRuntime,
  RealmTrait,
  summarizeRealmExpedition,
  VoxelTrait,
} from "@logic/games/voxel-realms/store/traits";
import { voxelEntity, voxelWorld } from "@logic/games/voxel-realms/store/world";
import { Canvas } from "@react-three/fiber";
import { useTrait, WorldProvider } from "koota/react";
import { useEffect, useState } from "react";
import { AudioBindings } from "./AudioBindings";
import { World } from "./r3f/World";
import { ExtractionBeat } from "./ui/ExtractionBeat";
import { FirstRunCoach } from "./ui/FirstRunCoach";
import { HUD } from "./ui/HUD";
import { NextRealmSplash } from "./ui/NextRealmSplash";
import { PauseOverlay } from "./ui/PauseOverlay";
import { RealmCollapsedScreen } from "./ui/RealmCollapsedScreen";
import { RealmLanding } from "./ui/RealmLanding";
import { SettingsScreen } from "./ui/SettingsScreen";

const MENU_PREVIEW_DELAY_MS = 900;
const PLAY_SCENE_DELAY_MS = 120;

function VoxelApp() {
  const state = useTrait(voxelEntity, VoxelTrait);
  const realmState = useTrait(voxelEntity, RealmTrait);
  const sceneMounted = useDeferredSceneMount(state.phase);
  const worldInteractive = useDeferredWorldInteractivity(state.phase === "playing");
  const [paused, setPaused] = useState(false);
  const [pauseSettingsOpen, setPauseSettingsOpen] = useState(false);

  const handleStart = () => {
    setPaused(false);
    setPauseSettingsOpen(false);
    voxelEntity.set(RealmTrait, createInitialRealmRuntime());
    voxelEntity.set(VoxelTrait, createInitialVoxelState("playing"));
  };

  const handleRestartRealm = () => {
    voxelEntity.set(
      RealmTrait,
      createInitialRealmRuntime(
        realmState.baseSeed,
        realmState.realmIndex,
        realmState.completedRealms
      )
    );
    voxelEntity.set(VoxelTrait, createInitialVoxelState("playing"));
    window.dispatchEvent(new Event("voxel:reset-player"));
    setPaused(false);
  };

  useEffect(() => {
    if (state.phase !== "playing") return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.code === "KeyP") {
        event.preventDefault();
        setPaused((v) => !v);
      }
      if (event.code === "Escape" && !paused) {
        event.preventDefault();
        setPaused(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [state.phase, paused]);

  return (
    <GameViewport
      background="#9fd7e8"
      data-realm-extraction-state={realmState.extractionState}
      data-realm-path-index={realmState.agentPathIndex}
      data-realm-scanned={realmState.discoveredAnomalies.length}
      data-realm-valid={realmState.activeRealm.validation.valid ? "true" : "false"}
    >
      <Canvas shadows camera={{ fov: 72, position: [0, 4.6, 0] }} gl={browserTestCanvasGlOptions}>
        {sceneMounted && state.phase !== "gameover" && (
          <World
            key={worldInteractive ? "interactive" : "preview"}
            interactive={worldInteractive}
          />
        )}
      </Canvas>

      {state.phase === "menu" && <RealmLanding onStart={handleStart} />}

      {state.phase === "playing" && (
        <>
          <HUD />
          <FirstRunCoach />
          <AudioBindings />
          <ExtractionBeat
            extractionState={realmState.extractionState}
            archetype={realmState.activeRealm.archetype.name}
            signalsScanned={realmState.discoveredAnomalies.length}
            nextArchetype={
              createRealmSequenceEntry(realmState.baseSeed, realmState.realmIndex + 1).archetype
            }
          />
          <NextRealmSplash
            realmIndex={realmState.realmIndex}
            archetypeId={realmState.activeRealm.archetype.id}
            archetypeName={realmState.activeRealm.archetype.name}
            archetypeVerb={realmState.activeRealm.archetype.verb}
            archetypeVerbDetail={realmState.activeRealm.archetype.verbDetail}
          />
          <button
            type="button"
            onClick={() => setPaused(true)}
            aria-label="Pause"
            data-testid="hud-pause-button"
            style={{
              position: "absolute",
              top: "clamp(0.5rem, 2vh, 1rem)",
              right: "clamp(0.5rem, 2vw, 1rem)",
              zIndex: 20,
              background: "rgba(8, 20, 24, 0.7)",
              color: "#f8fafc",
              border: "1px solid rgba(56, 189, 248, 0.45)",
              borderRadius: 8,
              padding: "0.5rem 0.8rem",
              fontSize: 11,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              fontWeight: 800,
              cursor: "pointer",
              backdropFilter: "blur(6px)",
            }}
          >
            ⏸ Pause
          </button>
          {paused ? (
            <PauseOverlay
              onResume={() => setPaused(false)}
              onOpenSettings={() => setPauseSettingsOpen(true)}
              onRestartRealm={handleRestartRealm}
              onAbandon={handleStart}
            />
          ) : null}
          {pauseSettingsOpen ? (
            <SettingsScreen
              onClose={() => setPauseSettingsOpen(false)}
              onReplayTutorial={() => {
                setPaused(false);
              }}
            />
          ) : null}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 28,
              height: 28,
              border: "2px solid rgba(255, 255, 255, 0.82)",
              borderRadius: "50%",
              pointerEvents: "none",
              boxShadow:
                "0 0 12px rgba(14, 165, 233, 0.55), inset 0 0 8px rgba(14, 165, 233, 0.35)",
              zIndex: 20,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#ffffff",
              pointerEvents: "none",
              zIndex: 21,
            }}
          />
        </>
      )}

      {state.phase === "gameover" && (
        <RealmCollapsedScreen
          archetype={realmState.activeRealm.archetype.name}
          signalsScanned={realmState.discoveredAnomalies.length}
          expedition={summarizeRealmExpedition(realmState)}
          score={scoreExpeditionFromRealmState(realmState)}
          onContinue={() => {
            voxelEntity.set(RealmTrait, createNextRealmRuntime(realmState));
            voxelEntity.set(VoxelTrait, createInitialVoxelState("playing"));
            window.dispatchEvent(new Event("voxel:reset-player"));
          }}
          onRetry={() => {
            voxelEntity.set(
              RealmTrait,
              createInitialRealmRuntime(
                realmState.baseSeed,
                realmState.realmIndex,
                realmState.completedRealms
              )
            );
            voxelEntity.set(VoxelTrait, createInitialVoxelState("playing"));
            window.dispatchEvent(new Event("voxel:reset-player"));
          }}
          onRestart={handleStart}
        />
      )}
    </GameViewport>
  );
}

function useDeferredSceneMount(phase: "menu" | "playing" | "gameover") {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (phase === "gameover") {
      setMounted(false);
      return undefined;
    }

    setMounted(false);

    const delay = phase === "playing" ? PLAY_SCENE_DELAY_MS : MENU_PREVIEW_DELAY_MS;
    let frame = 0;
    const timer = window.setTimeout(() => {
      frame = window.requestAnimationFrame(() => {
        setMounted(true);
      });
    }, delay);

    return () => {
      window.clearTimeout(timer);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [phase]);

  return mounted;
}

function useDeferredWorldInteractivity(isPlaying: boolean) {
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    if (!isPlaying) {
      setInteractive(false);
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      setInteractive(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      setInteractive(false);
    };
  }, [isPlaying]);

  return isPlaying && interactive;
}

export default function Game() {
  return (
    <WorldProvider world={voxelWorld}>
      <VoxelApp />
    </WorldProvider>
  );
}
