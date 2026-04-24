import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { PauseOverlay } from "@views/pause";

describe("PauseOverlay", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders four labelled actions", () => {
    render(
      <PauseOverlay
        onResume={vi.fn()}
        onOpenSettings={vi.fn()}
        onRestartRealm={vi.fn()}
        onAbandon={vi.fn()}
      />
    );
    expect(screen.getByTestId("pause-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("pause-resume")).toBeInTheDocument();
    expect(screen.getByTestId("pause-settings")).toBeInTheDocument();
    expect(screen.getByTestId("pause-restart")).toBeInTheDocument();
    expect(screen.getByTestId("pause-abandon")).toBeInTheDocument();
  });

  test("clicking Resume fires onResume", async () => {
    const user = userEvent.setup();
    const onResume = vi.fn();
    render(
      <PauseOverlay
        onResume={onResume}
        onOpenSettings={vi.fn()}
        onRestartRealm={vi.fn()}
        onAbandon={vi.fn()}
      />
    );
    await user.click(screen.getByTestId("pause-resume"));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  test("Escape key fires onResume", async () => {
    const user = userEvent.setup();
    const onResume = vi.fn();
    render(
      <PauseOverlay
        onResume={onResume}
        onOpenSettings={vi.fn()}
        onRestartRealm={vi.fn()}
        onAbandon={vi.fn()}
      />
    );
    await user.keyboard("{Escape}");
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  test("Restart and Abandon buttons fire their handlers", async () => {
    const user = userEvent.setup();
    const onRestartRealm = vi.fn();
    const onAbandon = vi.fn();
    render(
      <PauseOverlay
        onResume={vi.fn()}
        onOpenSettings={vi.fn()}
        onRestartRealm={onRestartRealm}
        onAbandon={onAbandon}
      />
    );
    await user.click(screen.getByTestId("pause-restart"));
    await user.click(screen.getByTestId("pause-abandon"));
    expect(onRestartRealm).toHaveBeenCalledTimes(1);
    expect(onAbandon).toHaveBeenCalledTimes(1);
  });
});
