import { describe, expect, it } from "vitest";
import { sanitizeAccountEntry } from "../accountEntry";

const TODAY = "2026-11-06";
const CELLS = ["FRA", null, null, null, null, null, null, null, null];
const FAILED = [0, 0, 0, 0, 0, 0, 0, 0, 0];

describe("sanitizeAccountEntry", () => {
  it("garde une entrée valide et son jeton", () => {
    const token = "00000000-0000-4000-8000-000000000001";
    expect(
      sanitizeAccountEntry(
        { date: TODAY, cells: CELLS, failed: FAILED, token },
        TODAY,
      )?.token,
    ).toBe(token);
  });

  it("refuse une date future", () => {
    expect(
      sanitizeAccountEntry(
        { date: "2026-11-07", cells: CELLS, failed: FAILED },
        TODAY,
      ),
    ).toBeNull();
  });

  it("refuse plus de 5 erreurs", () => {
    expect(
      sanitizeAccountEntry(
        { date: TODAY, cells: CELLS, failed: [6, 0, 0, 0, 0, 0, 0, 0, 0] },
        TODAY,
      ),
    ).toBeNull();
  });

  it("refuse un pays posé deux fois", () => {
    expect(
      sanitizeAccountEntry(
        {
          date: TODAY,
          cells: ["FRA", "FRA", ...CELLS.slice(2)],
          failed: FAILED,
        },
        TODAY,
      ),
    ).toBeNull();
  });

  it("refuse une entrée sans coup", () => {
    expect(
      sanitizeAccountEntry(
        { date: TODAY, cells: Array(9).fill(null), failed: FAILED },
        TODAY,
      ),
    ).toBeNull();
  });

  it("oublie un jeton illisible sans écarter l'entrée", () => {
    const entry = sanitizeAccountEntry(
      { date: TODAY, cells: CELLS, failed: FAILED, token: "nope" },
      TODAY,
    );
    expect(entry && "token" in entry).toBe(false);
  });
});
