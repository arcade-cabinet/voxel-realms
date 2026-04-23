import { resetRealmPreferencesForTests } from "@app/shared/platform/persistence/preferences";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { FirstRunCoach } from "./FirstRunCoach";

declare global {
  interface Window {
    __VOXEL_REALMS_TEST__?: boolean;
  }
}

describe("FirstRunCoach", () => {
  beforeEach(async () => {
    window.__VOXEL_REALMS_TEST__ = true;
    await resetRealmPreferencesForTests();
  });

  afterEach(() => {
    cleanup();
    window.__VOXEL_REALMS_TEST__ = false;
  });

  test("renders on first run and walks through 3 steps", async () => {
    const user = userEvent.setup();
    render(<FirstRunCoach forceShow />);

    const dialog = await screen.findByTestId("first-run-coach");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Follow the beacon/i)).toBeInTheDocument();

    await user.click(screen.getByTestId("first-run-coach-next"));
    expect(screen.getByText(/Stabilize the mesh/i)).toBeInTheDocument();

    await user.click(screen.getByTestId("first-run-coach-next"));
    expect(screen.getByText(/Before it falls/i)).toBeInTheDocument();

    await user.click(screen.getByTestId("first-run-coach-start"));
    await waitFor(() => {
      expect(screen.queryByTestId("first-run-coach")).not.toBeInTheDocument();
    });
  });

  test("skip button dismisses the coach", async () => {
    const user = userEvent.setup();
    render(<FirstRunCoach forceShow />);

    await screen.findByTestId("first-run-coach");
    await user.click(screen.getByTestId("first-run-coach-skip"));

    await waitFor(() => {
      expect(screen.queryByTestId("first-run-coach")).not.toBeInTheDocument();
    });
  });
});
