import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { NextRealmSplash } from "./NextRealmSplash";

describe("NextRealmSplash", () => {
  afterEach(() => {
    cleanup();
  });

  test("does not render on the initial realm (realmIndex 0)", () => {
    render(<NextRealmSplash realmIndex={0} archetypeId="jungle" archetypeName="Jungle" />);
    expect(screen.queryByTestId("next-realm-splash")).not.toBeInTheDocument();
  });

  test("renders when realmIndex > 0 with archetype teaser", async () => {
    render(<NextRealmSplash realmIndex={1} archetypeId="ocean" archetypeName="Ocean" />);

    const splash = await screen.findByTestId("next-realm-splash");
    expect(splash).toBeInTheDocument();
    expect(screen.getByText(/Ocean/)).toBeInTheDocument();
    expect(screen.getByText(/Floating platforms/i)).toBeInTheDocument();
  });

  test("falls back to generic teaser for unknown archetype", async () => {
    render(<NextRealmSplash realmIndex={2} archetypeId="unknown" archetypeName="Unknown" />);
    const splash = await screen.findByTestId("next-realm-splash");
    expect(splash).toBeInTheDocument();
    expect(screen.getByText(/Read the route/i)).toBeInTheDocument();
  });

  test("removes itself after the splash animation finishes", async () => {
    render(<NextRealmSplash realmIndex={3} archetypeId="arctic" archetypeName="Arctic" />);
    await screen.findByTestId("next-realm-splash");
    await waitFor(
      () => {
        expect(screen.queryByTestId("next-realm-splash")).not.toBeInTheDocument();
      },
      { timeout: 2_500 }
    );
  });
});
