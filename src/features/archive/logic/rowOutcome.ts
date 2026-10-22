import { hasEmptyCell } from "@/features/game/logic/blockedDetection";
import type { PersistedTrainingGame } from "./trainingPersistence";

export type RowOutcome =
  | { kind: "unfinished" }
  | { kind: "completed"; attempts: number }
  | { kind: "givenUp" };

/**
 * Issue d'une partie d'entraînement, lue dans le stockage local (l'entraînement
 * n'écrit rien côté serveur). La liste ne signale que le terminé.
 *
 * Une partie est terminée quand il ne reste aucune case vide : soit la grille est
 * pleine, soit les cases restantes sont bloquées. Les vies n'entrent pas en jeu,
 * puisque les essais sont illimités — et comme la grille finit donc presque
 * toujours pleine, seul le nombre d'essais distingue vraiment deux parties.
 * Une partie abandonnée est terminée elle aussi, mais son nombre d'essais ne dit
 * rien : on affiche l'abandon à la place (#148).
 */
export function rowOutcome(
  game: PersistedTrainingGame | undefined,
): RowOutcome {
  if (!game) return { kind: "unfinished" };
  if (game.givenUp === true) return { kind: "givenUp" };
  if (hasEmptyCell(game.cells)) return { kind: "unfinished" };
  return { kind: "completed", attempts: game.failedAttempts };
}
