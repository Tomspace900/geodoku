import { describe, expect, it } from "vitest";
import { submitValidatedGuess } from "../guessCommand";

describe("submitValidatedGuess", () => {
  it("returns accepted with the rarity when the server commits the guess", async () => {
    const result = await submitValidatedGuess(async () => ({
      kind: "accepted" as const,
      count: 2,
      total: 10,
      rarity: 0.2,
    }));

    expect(result).toEqual({ kind: "accepted", rarity: 0.2 });
  });

  it("returns unavailable when transport fails after local validation", async () => {
    const result = await submitValidatedGuess(async () => {
      throw new Error("offline");
    });

    expect(result).toEqual({ kind: "unavailable" });
  });

  it("treats an unexpected server rejection as an unavailable data divergence", async () => {
    const result = await submitValidatedGuess(async () => ({
      kind: "domain_rejected" as const,
      reason: "invalid_guess" as const,
    }));

    expect(result).toEqual({ kind: "unavailable" });
  });
});
