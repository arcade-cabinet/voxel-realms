import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useAutoPauseOnBackground } from "./use-auto-pause";

function Probe({ onBackground }: { onBackground: () => void }) {
  useAutoPauseOnBackground(onBackground);
  return null;
}

describe("useAutoPauseOnBackground", () => {
  afterEach(() => {
    cleanup();
    (window as unknown as { __VOXEL_REALMS_TEST__?: boolean }).__VOXEL_REALMS_TEST__ = undefined;
  });

  test("ignores visibilitychange when document is still visible", () => {
    const callback = vi.fn();
    render(<Probe onBackground={callback} />);

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Visibility is inherently driven by the real browser, so we only
    // assert that the "still visible" path does not fire the callback.
    // The pagehide + __VOXEL_REALMS_TEST__ tests cover the other paths.
    expect(callback).not.toHaveBeenCalled();
  });

  test("fires callback on window pagehide", () => {
    const callback = vi.fn();
    render(<Probe onBackground={callback} />);

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(callback).toHaveBeenCalled();
  });

  test("no-ops under __VOXEL_REALMS_TEST__ test harness flag", () => {
    (window as unknown as { __VOXEL_REALMS_TEST__?: boolean }).__VOXEL_REALMS_TEST__ = true;
    const callback = vi.fn();
    render(<Probe onBackground={callback} />);

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
