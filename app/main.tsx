import "@app/shared/styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Game from "./games/voxel-realms/Game";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <Game />
  </StrictMode>
);

const dismissBootSplash = () => {
  const splash = document.getElementById("boot-splash");
  if (!splash) return;
  splash.setAttribute("data-hidden", "true");
  window.setTimeout(() => splash.remove(), 420);
};
if (typeof window.requestAnimationFrame === "function") {
  window.requestAnimationFrame(() => window.requestAnimationFrame(dismissBootSplash));
} else {
  dismissBootSplash();
}

void import("./shared/platform")
  .then(({ bootstrapPlatform }) => bootstrapPlatform())
  .catch((error) => {
    console.error("Platform bootstrap failed", error);
  });
