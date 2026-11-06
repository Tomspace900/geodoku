import { STORAGE_KEYS, safeGet, safeRemove, safeSet } from "@/lib/storage";
import type { Cell, CellKey, LivesState } from "../types";
import { createBrowserUuidV4, isBrowserUuidV4 } from "./browserUuid";
import { CELL_KEYS } from "./gridTopology";
import { failedAttemptCount } from "./lives";

/**
 * Envoi des coups de la grille du jour (#70). La saisie reste locale et
 * instantanée ; les coups partent ensuite au serveur un par un, dans l'ordre,
 * avec leur rang (`moveIndex`). Le journal des coups vit ici, à côté de la
 * partie, pour survivre à un rechargement : un coup sans accusé repart au
 * chargement suivant, et le serveur ignore celui qu'il a déjà compté.
 *
 * Le jeton, tiré au premier coup, identifie la partie côté serveur (qui n'en
 * garde que le hash). Il ne sert qu'à cette partie.
 *
 * Pour un joueur connecté (#155), la partie est celle du compte : les coups
 * partent par `playAccountMove`, sans jeton. Une partie anonyme commencée
 * avant la connexion passe au compte une fois rattachée. Quand l'appareil
 * reprend la partie du serveur (jouée ailleurs), la file repart de ses coups
 * (`base`), dont on ne connaît que le nombre.
 */

export type SyncedMove = { cellKey: CellKey; countryCode: string };

export type MoveSyncOwner = "anon" | "account";

export type MoveSync = {
  date: string;
  token: string;
  owner: MoveSyncOwner;
  /** Coups déjà au serveur avant le premier de `moves` (partie reprise). */
  base: number;
  moves: SyncedMove[];
  /** Coups de `moves` acquittés par le serveur, dans l'ordre. */
  acked: number;
  /**
   * Refus définitif du serveur (autre jour, partie inconnue, rate limit) : la
   * partie continue en local seulement, sans plus rien envoyer.
   */
  stopped: boolean;
};

const MOVE_SYNC_VERSION = 1;
const CELL_KEY_SET = new Set<string>(CELL_KEYS);
const COUNTRY_CODE_PATTERN = /^[A-Z]{3}$/;

/** Coups joués d'une partie : cases remplies et erreurs. */
export function movesPlayed(
  cells: Record<CellKey, Cell>,
  lives: LivesState,
): number {
  return (
    Object.values(cells).filter((cell) => cell.status === "filled").length +
    failedAttemptCount(lives)
  );
}

export function startMoveSync(
  date: string,
  owner: MoveSyncOwner = "anon",
): MoveSync {
  return {
    date,
    token: createBrowserUuidV4(),
    owner,
    base: 0,
    moves: [],
    acked: 0,
    stopped: false,
  };
}

/**
 * La partie reprise du serveur (compte, jouée sur un autre appareil) : ses
 * `played` coups sont acquis, les suivants partiront à leur suite.
 */
export function resumeAccountSync(date: string, played: number): MoveSync {
  return { ...startMoveSync(date, "account"), base: played };
}

/** Coups de la partie connus de la file : acquis et à envoyer. */
export function syncedMoveCount(sync: MoveSync): number {
  return sync.base + sync.moves.length;
}

/** La partie anonyme rattachée au compte : la suite part par le compte. */
export function toAccountSync(sync: MoveSync): MoveSync {
  return { ...sync, owner: "account" };
}

export function appendMove(sync: MoveSync, move: SyncedMove): MoveSync {
  return { ...sync, moves: [...sync.moves, move] };
}

/** Un accusé, même en double ou hors d'ordre, ne fait jamais reculer. */
export function ackMove(sync: MoveSync, moveIndex: number): MoveSync {
  return { ...sync, acked: Math.max(sync.acked, moveIndex - sync.base + 1) };
}

export function stopMoveSync(sync: MoveSync): MoveSync {
  return { ...sync, stopped: true };
}

/** Prochain coup à envoyer, ou `null` s'il n'y a rien (ou plus rien) à envoyer. */
export function nextPendingMove(
  sync: MoveSync,
): { moveIndex: number; move: SyncedMove } | null {
  if (sync.stopped || sync.acked >= sync.moves.length) return null;
  return { moveIndex: sync.base + sync.acked, move: sync.moves[sync.acked] };
}

/**
 * Plus rien à envoyer : file vide, arrêtée, ou partie restée locale. La
 * cohorte du jour ne compte la partie qu'à partir de là.
 */
export function isMoveSyncSettled(sync: MoveSync | null): boolean {
  return sync === null || nextPendingMove(sync) === null;
}

function isSyncedMove(raw: unknown): raw is SyncedMove {
  if (!raw || typeof raw !== "object") return false;
  const move = raw as Record<string, unknown>;
  return (
    typeof move.cellKey === "string" &&
    CELL_KEY_SET.has(move.cellKey) &&
    typeof move.countryCode === "string" &&
    COUNTRY_CODE_PATTERN.test(move.countryCode)
  );
}

export function sanitizeMoveSync(raw: unknown): MoveSync | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== MOVE_SYNC_VERSION) return null;
  if (typeof o.date !== "string" || !isBrowserUuidV4(o.token)) return null;
  if (!Array.isArray(o.moves) || !o.moves.every(isSyncedMove)) return null;
  const acked = o.acked;
  if (
    typeof acked !== "number" ||
    !Number.isInteger(acked) ||
    acked < 0 ||
    acked > o.moves.length
  ) {
    return null;
  }
  // Absents avant #155 : une partie anonyme, partie de zéro.
  const base = o.base ?? 0;
  if (typeof base !== "number" || !Number.isInteger(base) || base < 0) {
    return null;
  }
  return {
    date: o.date,
    token: o.token,
    owner: o.owner === "account" ? "account" : "anon",
    base,
    moves: o.moves,
    acked,
    stopped: o.stopped === true,
  };
}

export function loadMoveSync(): MoveSync | null {
  // Opérations en attente de l'ancien envoi (avant #70) : plus rien ne les lit.
  safeRemove(STORAGE_KEYS.pendingOperations);
  const raw = safeGet(STORAGE_KEYS.moveSync);
  if (!raw) return null;
  try {
    return sanitizeMoveSync(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveMoveSync(sync: MoveSync): void {
  safeSet(
    STORAGE_KEYS.moveSync,
    JSON.stringify({ version: MOVE_SYNC_VERSION, ...sync }),
  );
}

export function clearMoveSync(): void {
  safeRemove(STORAGE_KEYS.moveSync);
}
