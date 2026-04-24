import { browserTestCanvasGlOptions, GameViewport } from "@app/shared";
import { scoreExpeditionFromRealmState } from "@logic/games/voxel-realms/engine/progression";
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
import { FirstRunCoach } from "./ui/FirstRunCoach";
import { HUD } from "./ui/HUD";
import { RealmCollapsedScreen } from "./ui/RealmCollapsedScreen";
import { RealmLanding } from "./ui/RealmLanding";

const MENU_PREVIEW_DELAY_MS = 900;
const PLAY_SCENE_DELAY_MS = 120;

function VoxelApp() {
  const state = useTrait(voxelEntity, VoxelTrait);
  const realmState = useTrait(voxelEntity, RealmTrait);
  const sceneMounted = useDeferredSceneMount(state.phase);
  const worldInteractive = useDeferredWorldInteractivity(state.phase === "playing");

  const handleStart = () => {
    voxelEntity.set(RealmTrait, createInitialRealmRuntime());
    voxelEntity.set(VoxelTrait, createInitialVoxelState("playing"));
  };

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
