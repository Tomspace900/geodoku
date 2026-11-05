import { randomUUID } from "node:crypto";
import type { SimAction } from "../../src/features/game/testing/simulation";
import type { CellKey } from "../../src/features/game/types";

type MoveWrite = {
  date: string;
  token: string;
  clientId: string;
  moveIndex: number;
  cellKey: CellKey;
  countryCode: string;
};

/** Issue d'un coup côté serveur : seul `rejected` interrompt la partie. */
type MoveWriteResult =
  | { kind: "applied" | "duplicate" }
  | {
      kind: "rejected";
      reason: string;
    };

export type SimulationWriter = {
  playMove: (args: MoveWrite) => Promise<MoveWriteResult>;
};

type PersistSimulationPlanArgs = {
  execute: boolean;
  writer: SimulationWriter;
  date: string;
  clientId: string;
  actions: SimAction[];
  createToken?: () => string;
};

/**
 * Joue un plan coup par coup, comme le navigateur : un jeton par partie et le
 * rang de chaque coup. Rien n'est écrit sans consentement explicite.
 */
export async function persistSimulationPlan({
  execute,
  writer,
  date,
  clientId,
  actions,
  createToken = randomUUID,
}: PersistSimulationPlanArgs): Promise<boolean> {
  if (!execute) return false;

  const token = createToken();
  for (const [moveIndex, action] of actions.entries()) {
    const result = await writer.playMove({
      date,
      token,
      clientId,
      moveIndex,
      cellKey: action.cellKey,
      countryCode: action.countryCode,
    });
    if (result.kind === "rejected") {
      throw new Error(`coup ${moveIndex} refusé : ${result.reason}`);
    }
  }
  return true;
}
