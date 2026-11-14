import { describe, expect, it } from "vitest";
import { persistedFromRecord, recordOfState, sameRecord } from "../accountGame";
import { emptyGameRecord } from "../gameRecord";
import { createInitialState } from "../reducer";

const ANSWERS: Record<string, string[]> = {
  "0,0": ["FRA"],
  "0,1": ["ITA"],
  "0,2": ["ESP"],
  "1,0": ["PRT"],
  "1,1": ["BEL"],
  "1,2": ["NLD"],
  "2,0": ["AUT"],
  "2,1": ["CHE"],
  "2,2": ["POL"],
};

describe("accountGame", () => {
  it("lit une partie vierge comme une ligne vide", () => {
    const state = createInitialState("daily", "2026-11-06", [], []);
    expect(sameRecord(recordOfState(state), emptyGameRecord())).toBe(true);
  });

  it("voit une ligne jouée ailleurs comme différente", () => {
    const record = emptyGameRecord();
    record.cells[0] = "FRA";
    expect(sameRecord(record, emptyGameRecord())).toBe(false);
  });

  it("reprend une partie finie ailleurs sans réémettre sa fin", () => {
    const record = emptyGameRecord();
    record.failed[0] = 5;
    expect(persistedFromRecord("2026-11-06", record, ANSWERS)).toMatchObject({
      status: "lost",
      endRecorded: true,
    });
  });

  it("reprend les vies de la ligne", () => {
    const record = emptyGameRecord();
    record.failed[3] = 2;
    expect(persistedFromRecord("2026-11-06", record, ANSWERS).lives).toEqual({
      kind: "limited",
      remaining: 3,
    });
  });
});
