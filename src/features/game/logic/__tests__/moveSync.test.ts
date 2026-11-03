import { describe, expect, it } from "vitest";
import {
  ackMove,
  appendMove,
  nextPendingMove,
  sanitizeMoveSync,
  startMoveSync,
  stopMoveSync,
} from "../moveSync";

const DATE = "2026-11-03";
const FIRST = { cellKey: "0,0" as const, countryCode: "FRA" };
const SECOND = { cellKey: "0,1" as const, countryCode: "ITA" };

describe("moveSync", () => {
  it("envoie les coups dans l'ordre, du premier non acquitté", () => {
    const sync = ackMove(
      appendMove(appendMove(startMoveSync(DATE), FIRST), SECOND),
      0,
    );
    expect(nextPendingMove(sync)).toEqual({ moveIndex: 1, move: SECOND });
  });

  it("ne recule jamais sur un accusé en double", () => {
    const sync = ackMove(ackMove(appendMove(startMoveSync(DATE), FIRST), 0), 0);
    expect(sync.acked).toBe(1);
  });

  it("n'envoie plus rien après un refus définitif", () => {
    const sync = stopMoveSync(appendMove(startMoveSync(DATE), FIRST));
    expect(nextPendingMove(sync)).toBeNull();
  });

  it("tire un jeton UUID v4 propre à la partie", () => {
    expect(startMoveSync(DATE).token).not.toBe(startMoveSync(DATE).token);
  });
});

describe("sanitizeMoveSync", () => {
  const valid = {
    version: 1,
    date: DATE,
    token: "123e4567-e89b-42d3-a456-426614174000",
    moves: [FIRST],
    acked: 1,
    stopped: false,
  };

  it("relit une file intacte", () => {
    expect(sanitizeMoveSync(valid)?.acked).toBe(1);
  });

  it("écarte une file dont l'accusé dépasse les coups", () => {
    expect(sanitizeMoveSync({ ...valid, acked: 2 })).toBeNull();
  });

  it("écarte un coup sur une case hors grille", () => {
    expect(
      sanitizeMoveSync({
        ...valid,
        moves: [{ cellKey: "3,3", countryCode: "FRA" }],
      }),
    ).toBeNull();
  });
});
