import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { NextRealmSplash } from "./NextRealmSplash";

describe("NextRealmSplash", () => {
  afterEach(() => {
    cleanup();
  });

  test("does not render on the initial realm (realmIndex 0)", () => {
    render(
      <NextRealmSplash
        realmIndex={0}
        archetypeId="jungle"
        archetypeName="Jungle"
        archetypeVerb="Swing"
        archetypeVerbDetail="Layered canopy routes. Creatures signal between the branches."
      />
    );
    expect(screen.queryByTestId("next-realm-splash")).not.toBeInTheDocument();
  });

  test("renders archetype name, verb, and detail when realmIndex > 0", async () => {
    render(
      <NextRealmSplash
        realmIndex={1}
        archetypeId="ocean"
        archetypeName="Ocean"
        archetypeVerb="Surf"
        archetypeVerbDetail="Floating platforms over open water. Tide sets the beat of the climb."
      />
    );

    const splash = await screen.findByTestId("next-realm-splash");
    expect(splash).toBeInTheDocument();
    expect(screen.getByText("Ocean")).toBeInTheDocument();
    expect(screen.getByTestId("next-realm-splash-verb")).toHaveTextContent("Surf");
    expect(screen.getByText(/Floating platforms/i)).toBeInTheDocument();
  });

  test("removes itself after the splash animation finishes", async () => {
    render(
      <NextRealmSplash
        realmIndex={3}
        archetypeId="arctic"
        archetypeName="Arctic"
        archetypeVerb="Glide"
        archetypeVerbDetail="Thin ice, low-key light. Sparse landings, narrow margin."
      />
    );
    await screen.findByTestId("next-realm-splash");
    await waitFor(
      () => {
        expect(screen.queryByTestId("next-realm-splash")).not.toBeInTheDocument();
      },
      { timeout: 2_500 }
    );
  });
});
