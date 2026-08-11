import { describe, expect, test } from "vitest";
import type { SimAction } from "../../../src/features/game/testing/simulation";
import {
  persistSimulationPlan,
  type SimulationWriter,
} from "../simulate-players-execution";

function createWriter(calls: string[]): SimulationWriter {
  return {
    submitGuess: async ({ operationId }) => {
      calls.push(`submit:${operationId}`);
    },
    recordFailedGuess: async ({ operationId }) => {
      calls.push(`fail:${operationId}`);
    },
    recordGameEnd: async ({ operationId }) => {
      calls.push(`end:${operationId}`);
    },
  };
}

const actions: SimAction[] = [
  { type: "submit", cellKey: "0,0", countryCode: "FRA" },
  { type: "fail", cellKey: "0,1", countryCode: "BRA" },
];
const target = {
  endReason: "lives" as const,
  filledCells: 1,
  livesLeft: 0,
};

describe("persistSimulationPlan", () => {
  test("n'écrit rien en dry-run", async () => {
    const calls: string[] = [];

    const written = await persistSimulationPlan({
      execute: false,
      writer: createWriter(calls),
      clientId: "sim-client",
      actions,
      target,
    });

    expect({ written, calls }).toEqual({ written: false, calls: [] });
  });

  test("attribue une opération distincte à chaque écriture", async () => {
    const calls: string[] = [];
    let sequence = 0;

    const written = await persistSimulationPlan({
      execute: true,
      writer: createWriter(calls),
      clientId: "sim-client",
      actions,
      target,
      createOperationId: () => `operation-${++sequence}`,
    });

    expect({ written, calls }).toEqual({
      written: true,
      calls: ["submit:operation-1", "fail:operation-2", "end:operation-3"],
    });
  });
});
