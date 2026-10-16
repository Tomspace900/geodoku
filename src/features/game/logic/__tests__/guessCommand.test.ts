import { describe, expect, it } from "vitest";
import {
  deliverGuess,
  guessOperationSlot,
  parseGuessOperationSlot,
} from "../guessCommand";

describe("deliverGuess", () => {
  it("returns delivered with the rarity when the server counts the guess", async () => {
    const result = await deliverGuess(async () => ({
      kind: "accepted" as const,
      count: 2,
      total: 10,
      rarity: 0.2,
    }));

    expect(result).toEqual({ kind: "delivered", rarity: 0.2 });
  });

  it("keeps the guess pending when the transport fails", async () => {
    const result = await deliverGuess(async () => {
      throw new Error("offline");
    });

    expect(result).toEqual({ kind: "retry_later" });
  });

  it("drops a guess the server will never count", async () => {
    const result = await deliverGuess(async () => ({
      kind: "domain_rejected" as const,
      reason: "date_mismatch" as const,
    }));

    expect(result).toEqual({ kind: "dropped" });
  });
});

describe("guess operation slots", () => {
  it("round-trips a pending guess through its slot", () => {
    const guess = {
      date: "2026-10-16",
      cellKey: "2,1" as const,
      countryCode: "FRA",
    };

    expect(parseGuessOperationSlot(guessOperationSlot(guess))).toEqual(guess);
  });

  it("ignores slots of other operations", () => {
    expect(parseGuessOperationSlot("game-end:2026-10-16")).toBeNull();
  });

  it("ignores a slot pointing outside the grid", () => {
    expect(parseGuessOperationSlot("guess:2026-10-16:3,0:FRA")).toBeNull();
  });
});
