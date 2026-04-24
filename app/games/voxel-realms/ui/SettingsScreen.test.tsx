import { resetRealmPreferencesForTests } from "@app/shared/platform/persistence/preferences";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SettingsScreen } from "./SettingsScreen";

describe("SettingsScreen", () => {
  beforeEach(async () => {
    window.__VOXEL_REALMS_TEST__ = true;
    await resetRealmPreferencesForTests();
  });

  afterEach(() => {
    cleanup();
    window.__VOXEL_REALMS_TEST__ = false;
  });

  test("renders three toggles and a close button", async () => {
    const onClose = vi.fn();
    render(<SettingsScreen onClose={onClose} />);
    await screen.findByTestId("settings-screen");

    expect(screen.getByTestId("settings-toggle-audio")).toBeInTheDocument();
    expect(screen.getByTestId("settings-toggle-haptics")).toBeInTheDocument();
    expect(screen.getByTestId("settings-toggle-motion")).toBeInTheDocument();
    expect(screen.getByTestId("settings-close")).toBeInTheDocument();
  });

  test("toggling audio flips aria-checked state", async () => {
    const user = userEvent.setup();
    render(<SettingsScreen onClose={vi.fn()} />);
    const toggle = await screen.findByTestId("settings-toggle-audio");

    await waitFor(() => expect(toggle).not.toBeDisabled());
    expect(toggle.getAttribute("aria-checked")).toBe("true");

    await user.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    await user.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  test("close button invokes onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SettingsScreen onClose={onClose} />);
    await screen.findByTestId("settings-screen");

    await user.click(screen.getByTestId("settings-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("replay tutorial fires onReplayTutorial then onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onReplayTutorial = vi.fn();
    render(<SettingsScreen onClose={onClose} onReplayTutorial={onReplayTutorial} />);
    await screen.findByTestId("settings-screen");

    await user.click(screen.getByTestId("settings-replay-tutorial"));
    await waitFor(() => expect(onReplayTutorial).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
