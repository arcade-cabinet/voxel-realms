import { configureNativeShell } from "./nativeShell";
import { initializePersistence } from "./persistence/storage";

export async function bootstrapPlatform(): Promise<void> {
  await Promise.all([initializePersistence(), configureNativeShell()]);
}
