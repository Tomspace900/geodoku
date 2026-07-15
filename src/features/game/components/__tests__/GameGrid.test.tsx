import { LocaleProvider } from "@/i18n/LocaleContext";
import { STORAGE_KEYS, safeSet } from "@/lib/storage";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createInitialState } from "../../logic/reducer";
import { GameGrid } from "../GameGrid";

describe("GameGrid", () => {
  it("names a blocked cell for assistive technologies", () => {
    safeSet(STORAGE_KEYS.locale, "en");
    const state = createInitialState(
      "2026-07-15",
      ["continent_europe", "continent_asia", "continent_africa"],
      ["water_landlocked", "water_island", "borders_min_5"],
    );
    state.cells["0,2"] = { status: "blocked" };

    render(
      <LocaleProvider>
        <GameGrid
          state={state}
          distribution={undefined}
          onCellClick={() => {}}
        />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("cell", {
        name: /^Blocked cell row 1 column 3: European country × At least 5\s+land neighbors$/,
      }),
    ).toBeTruthy();
  });
});
