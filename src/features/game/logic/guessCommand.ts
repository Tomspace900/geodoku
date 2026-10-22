import type { CellKey } from "./gridTopology";

type AcceptedServerGuess = {
  kind: "accepted";
  count: number;
  total: number;
  rarity: number;
};

type RejectedServerGuess = {
  kind: "domain_rejected";
  reason: "invalid_guess" | "date_mismatch";
};

export type ServerGuessResult = AcceptedServerGuess | RejectedServerGuess;

/**
 * Issue d'un envoi de coup déjà validé localement et déjà affiché :
 * - `delivered` : compté dans la cohorte ;
 * - `dropped` : refus définitif (divergence de snapshot, autre jour). Le coup
 *   reste sur la grille du joueur, il ne sera simplement jamais compté ;
 * - `retry_later` : transport ou serveur en échec, l'envoi reste en attente et
 *   sera rejoué au prochain chargement.
 */
export type GuessDelivery =
  | { kind: "delivered"; rarity: number }
  | { kind: "dropped" }
  | { kind: "retry_later" };

export async function deliverGuess(
  submit: () => Promise<ServerGuessResult>,
): Promise<GuessDelivery> {
  try {
    const result = await submit();
    return result.kind === "accepted"
      ? { kind: "delivered", rarity: result.rarity }
      : { kind: "dropped" };
  } catch {
    return { kind: "retry_later" };
  }
}

export type PendingGuess = {
  date: string;
  cellKey: CellKey;
  countryCode: string;
};

const GUESS_SLOT_PREFIX = "guess:";
const GUESS_SLOT_PATTERN =
  /^guess:(\d{4}-\d{2}-\d{2}):([0-2],[0-2]):([A-Z]{3})$/;

/** Clé d'opération persistée d'un coup : un même coup garde son `operationId`. */
export function guessOperationSlot(guess: PendingGuess): string {
  return `${GUESS_SLOT_PREFIX}${guess.date}:${guess.cellKey}:${guess.countryCode}`;
}

/** Relit un coup en attente depuis sa clé ; `null` pour toute autre opération. */
export function parseGuessOperationSlot(slot: string): PendingGuess | null {
  const match = GUESS_SLOT_PATTERN.exec(slot);
  if (!match) return null;
  return {
    date: match[1],
    // Le motif ne laisse passer que les neuf coordonnées de la grille.
    cellKey: match[2] as CellKey,
    countryCode: match[3],
  };
}
