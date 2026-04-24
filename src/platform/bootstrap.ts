import { configureNativeShell } from "./native-shell";
import { initializePersistence } from "./storage";

export async function bootstrapPlatform(): Promise<void> {
  await Promise.all([initializePersistence(), configureNativeShell()]);
}
