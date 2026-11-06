import { describe, expect, it } from "vitest";
import { chunkEntries, entriesToSync } from "../syncChunks";

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

describe("entriesToSync", () => {
  const journal = ["2026-11-01", "2026-11-03", "2026-11-05"].map((date) => ({
    ...ENTRY,
    date,
  }));

  it("renvoie tout le journal à une nouvelle session", () => {
    expect(
      entriesToSync(journal, { session: "a", through: "2026-11-05" }, "b"),
    ).toHaveLength(3);
  });

  it("ne renvoie que les jours depuis le dernier rattaché", () => {
    expect(
      entriesToSync(journal, { session: "a", through: "2026-11-03" }, "a").map(
        (entry) => entry.date,
      ),
    ).toEqual(["2026-11-03", "2026-11-05"]);
  });
});
