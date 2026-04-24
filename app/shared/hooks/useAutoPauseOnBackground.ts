import { useEffect } from "react";

/**
 * Fires `onBackground` when the page becomes hidden (tab switch,
 * window minimize, Capacitor app-pause) so the game can snap itself
 * into the paused state instead of burning battery animating a scene
 * the player cannot see.
 *
 * No-ops under the browser test harness to keep the golden-path
 * deterministic when Playwright loses focus mid-run.
 */
export function useAutoPauseOnBackground(onBackground: () => void): void {
  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return undefined;
    }

    const testGlobal = window as unknown as { __VOXEL_REALMS_TEST__?: boolean };
    if (testGlobal.__VOXEL_REALMS_TEST__ === true) {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        onBackground();
      }
    };

    const handleBlur = () => {
      // Some mobile browsers fire `blur` before `visibilitychange` when the
      // user swipes to the app switcher. Treat it as a pause signal too.
      onBackground();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handleBlur);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handleBlur);
      window.removeEventListener("blur", handleBlur);
    };
  }, [onBackground]);
}
