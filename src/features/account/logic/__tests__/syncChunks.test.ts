import { describe, expect, it } from "vitest";
import { chunkEntries } from "../syncChunks";

const ENTRY = {
  date: "2026-11-01",
  cells: Array(9).fill(null),
  failed: Array(9).fill(0),
};

describe("chunkEntries", () => {
  it("fait toujours au moins un appel, qui crée le profil", () => {
    expect(chunkEntries([])).toEqual([[]]);
  });

  it("découpe par tranches", () => {
    expect(chunkEntries(Array(5).fill(ENTRY), 2).map((c) => c.length)).toEqual([
      2, 2, 1,
    ]);
  });
});
