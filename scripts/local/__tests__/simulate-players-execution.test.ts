import { describe, expect, test } from "vitest";
import type { SimAction } from "../../../src/features/game/testing/simulation";
import {
  persistSimulationPlan,
  type SimulationWriter,
} from "../simulate-players-execution";

function createWriter(
  calls: string[],
  reject: number | null = null,
): SimulationWriter {
  return {
    playMove: async ({ token, moveIndex, cellKey }) => {
      calls.push(`${token}:${moveIndex}:${cellKey}`);
      return moveIndex === reject
        ? { kind: "rejected", reason: "rate_limited" }
        : { kind: "applied" };
    },
  };
}

const actions: SimAction[] = [
  { type: "submit", cellKey: "0,0", countryCode: "FRA" },
  { type: "fail", cellKey: "0,1", countryCode: "BRA" },
];
const base = { date: "2026-11-03", clientId: "sim-client", actions };

describe("persistSimulationPlan", () => {
  test("n'écrit rien en dry-run", async () => {
    const calls: string[] = [];

    const written = await persistSimulationPlan({
      ...base,
      execute: false,
      writer: createWriter(calls),
    });

    expect({ written, calls }).toEqual({ written: false, calls: [] });
  });

  test("joue chaque coup avec le jeton de la partie et son rang", async () => {
    const calls: string[] = [];

    const written = await persistSimulationPlan({
      ...base,
      execute: true,
      writer: createWriter(calls),
      createToken: () => "token",
    });

    expect({ written, calls }).toEqual({
      written: true,
      calls: ["token:0:0,0", "token:1:0,1"],
    });
  });

  test("s'arrête au premier refus du serveur", async () => {
    await expect(
      persistSimulationPlan({
        ...base,
        execute: true,
        writer: createWriter([], 0),
      }),
    ).rejects.toThrow("rate_limited");
  });
});
