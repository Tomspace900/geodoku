import { randomUUID } from "node:crypto";
import { STARTING_LIVES } from "../../src/features/game/logic/constants";
import type {
  PlayerTarget,
  SimAction,
} from "../../src/features/game/testing/simulation";
import type { CellKey } from "../../src/features/game/types";

type GuessWrite = {
  operationId: string;
  cellKey: CellKey;
  countryCode: string;
  clientId: string;
};

type GameEndWrite = {
  operationId: string;
  endReason: PlayerTarget["endReason"];
  livesLeft: number;
  filledCells: number;
  guessesSubmitted: number;
  clientId: string;
};

export type SimulationWriter = {
  submitGuess: (args: GuessWrite) => Promise<void>;
  recordFailedGuess: (args: GuessWrite) => Promise<void>;
  recordGameEnd: (args: GameEndWrite) => Promise<void>;
};

type PersistSimulationPlanArgs = {
  execute: boolean;
  writer: SimulationWriter;
  clientId: string;
  actions: SimAction[];
  target: PlayerTarget;
  createOperationId?: () => string;
};

/** Écrit un plan uniquement après consentement explicite et idempotence par opération. */
export async function persistSimulationPlan({
  execute,
  writer,
  clientId,
  actions,
  target,
  createOperationId = randomUUID,
}: PersistSimulationPlanArgs): Promise<boolean> {
  if (!execute) return false;

  for (const action of actions) {
    const args = {
      operationId: createOperationId(),
      cellKey: action.cellKey,
      countryCode: action.countryCode,
      clientId,
    };
    if (action.type === "submit") await writer.submitGuess(args);
    else await writer.recordFailedGuess(args);
  }

  await writer.recordGameEnd({
    operationId: createOperationId(),
    endReason: target.endReason,
    livesLeft: target.livesLeft,
    filledCells: target.filledCells,
    guessesSubmitted: target.filledCells + (STARTING_LIVES - target.livesLeft),
    clientId,
  });
  return true;
}
