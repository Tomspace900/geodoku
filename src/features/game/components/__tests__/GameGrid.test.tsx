import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { createInitialState } from "../../logic/reducer";
import { GameGrid } from "../GameGrid";

describe("GameGrid", () => {
  it("names a blocked cell for assistive technologies", () => {
    const state = createInitialState(
      "daily",
      "2026-07-15",
      ["continent_europe", "continent_asia", "continent_africa"],
      ["water_landlocked", "water_island", "borders_min_5"],
    );
    state.cells["0,2"] = { status: "blocked" };

    render(
      <MemoryRouter initialEntries={["/en"]}>
        <LocaleProvider>
          <GameGrid
            state={state}
            distribution={undefined}
            onCellClick={() => {}}
            onHeaderClick={() => {}}
            onBlockedCellClick={() => {}}
          />
        </LocaleProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("button", {
        name: /^Blocked cell row 1 column 3: European country × At least 5\s+land neighbors$/,
      }),
    ).toBeTruthy();
  });
});
