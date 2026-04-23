import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

const SHELL_COLOR = "#07090d";

export async function configureNativeShell(): Promise<void> {
  if (isBrowserTestEnv()) {
    return;
  }

  if (Capacitor.getPlatform() !== "web") {
    try {
      await App.getState();
    } catch {
      // App state is best-effort shell metadata.
    }
  }

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: SHELL_COLOR });
  } catch {
    // Browser and unsupported native shells can ignore status bar decoration.
  }

  try {
    await SplashScreen.hide();
  } catch {
    // Safe on web/test.
  }
}

function isBrowserTestEnv(): boolean {
  return typeof window !== "undefined" && window.__VOXEL_REALMS_TEST__ === true;
}
