/**
 * Opt-in anonymous error telemetry.
 *
 * Default is OFF. When the player opts in, uncaught errors and promise
 * rejections are captured to a bounded in-memory ring buffer; a future
 * release can push the buffer to an endpoint if the player explicitly
 * enables upload. Until that pipeline exists, the buffer is local-only
 * and surfaced through getCapturedErrors() for support diagnostics.
 *
 * Design rules:
 *  - No network calls without an explicit `transport` being wired in.
 *  - Stack traces are redacted of file paths that look like user data.
 *  - Ring buffer size is small (30) to avoid unbounded memory growth.
 */

const MAX_BUFFERED_ERRORS = 30;

export interface TelemetryError {
  message: string;
  stack: string | null;
  source: "error" | "unhandledrejection";
  capturedAt: number;
}

interface TelemetryState {
  enabled: boolean;
  buffer: TelemetryError[];
  attached: boolean;
  cleanup: (() => void) | null;
}

const state: TelemetryState = {
  enabled: false,
  buffer: [],
  attached: false,
  cleanup: null,
};

function redactStack(raw: string | undefined): string | null {
  if (!raw) return null;
  // Strip file:// and user-home-ish absolute paths so nothing under
  // /Users/<name>/ or C:\Users\<name>\ leaks if a crash dump is
  // forwarded to the project maintainers.
  return raw
    .replace(/\(file:\/\/\/[^)]+\)/g, "(redacted)")
    .replace(/\/Users\/[^/\s)]+/g, "/Users/<redacted>")
    .replace(/C:\\Users\\[^\\]+/gi, "C:\\Users\\<redacted>");
}

function captureError(
  message: string,
  stack: string | undefined,
  source: TelemetryError["source"]
) {
  if (!state.enabled) return;
  const entry: TelemetryError = {
    message: message.slice(0, 500),
    stack: redactStack(stack),
    source,
    capturedAt: Date.now(),
  };
  state.buffer.push(entry);
  while (state.buffer.length > MAX_BUFFERED_ERRORS) {
    state.buffer.shift();
  }
}

function attachListeners(): void {
  if (state.attached || typeof window === "undefined") return;
  const handleError = (event: ErrorEvent) => {
    captureError(event.message || "Unknown error", event.error?.stack, "error");
  };
  const handleRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "Unhandled rejection";
    const stack = reason instanceof Error ? reason.stack : undefined;
    captureError(message, stack, "unhandledrejection");
  };
  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);
  state.attached = true;
  state.cleanup = () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
    state.attached = false;
    state.cleanup = null;
  };
}

export function enableErrorTelemetry(): void {
  state.enabled = true;
  attachListeners();
}

export function disableErrorTelemetry(): void {
  state.enabled = false;
  // Leave listeners attached — re-enabling is cheap and listeners are
  // silent when state.enabled is false.
}

export function isErrorTelemetryEnabled(): boolean {
  return state.enabled;
}

export function getCapturedErrors(): readonly TelemetryError[] {
  return state.buffer.slice();
}

export function clearCapturedErrors(): void {
  state.buffer = [];
}

/**
 * Internal helper used by tests. Also detaches listeners so the
 * next test file starts clean.
 */
export function resetErrorTelemetryForTests(): void {
  state.enabled = false;
  state.buffer = [];
  state.cleanup?.();
}
