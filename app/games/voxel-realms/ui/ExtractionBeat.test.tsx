import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { ExtractionBeat } from "./ExtractionBeat";

describe("ExtractionBeat", () => {
  afterEach(() => {
    cleanup();
  });

  test("does not render while ascending", () => {
    render(
      <ExtractionBeat
        extractionState="ascending"
        archetype="Jungle"
        signalsScanned={2}
        nextArchetype="ocean"
      />
    );
    expect(screen.queryByTestId("extraction-beat")).not.toBeInTheDocument();
  });

  test("renders on extraction and announces the archetype + next realm", async () => {
    const { rerender } = render(
      <ExtractionBeat
        extractionState="ascending"
        archetype="Jungle"
        signalsScanned={3}
        nextArchetype="ocean"
      />
    );

    rerender(
      <ExtractionBeat
        extractionState="extracted"
        archetype="Jungle"
        signalsScanned={3}
        nextArchetype="ocean"
      />
    );

    const beat = await screen.findByTestId("extraction-beat");
    expect(beat).toBeInTheDocument();
    expect(screen.getByText(/Extracted/i)).toBeInTheDocument();
    expect(screen.getByText(/Jungle/)).toBeInTheDocument();
    expect(screen.getByText(/3 signals/)).toBeInTheDocument();
    expect(screen.getByText(/next: ocean/)).toBeInTheDocument();
  });

  test("removes itself after the beat completes", async () => {
    render(
      <ExtractionBeat
        extractionState="extracted"
        archetype="Ocean"
        signalsScanned={1}
        nextArchetype="steampunk"
      />
    );
    await screen.findByTestId("extraction-beat");
    await waitFor(
      () => {
        expect(screen.queryByTestId("extraction-beat")).not.toBeInTheDocument();
      },
      { timeout: 2_500 }
    );
  });
});
