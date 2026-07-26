import { STARTING_LIVES } from "@/features/game/logic/constants";
import { CELL_KEYS } from "@/features/game/logic/gridTopology";
import type { PersistedGame } from "@/features/game/logic/persistence";
import { canonicalStatus } from "@/features/game/logic/sanitizePersisted";
import type { Cell, CellKey } from "@/features/game/types";

/**
 * L'archive n'ouvre qu'une fois la grille du jour terminée (gagnée ou perdue) —
 * sinon on renvoie le joueur sur `/`. C'est un garde **d'expérience, pas de
 * sécurité** : l'endpoint des grilles passées est public et sans identité, et
 * ces grilles sont de toute façon déjà connues.
 *
 * Volontairement dérivé du seul stockage local, sans `validAnswers` : la décision
 * est donc synchrone au premier rendu, sans charger la grille du jour et sans
 * flash de contenu avant la redirection.
 */
export function isDailyGameFinished(
  persisted: PersistedGame | null,
  today: string,
): boolean {
  if (!persisted || persisted.date !== today) return false;
  if (!persisted.cells || typeof persisted.cells !== "object") return false;

  const cells = {} as Record<CellKey, Cell>;
  let filledCount = 0;
  for (const key of CELL_KEYS) {
    const cell = persisted.cells[key];
    if (!cell || typeof cell !== "object") return false;
    cells[key] = cell;
    if (cell.status === "filled") filledCount++;
  }

  const remaining = Number.isFinite(persisted.remainingLives)
    ? Math.min(
        STARTING_LIVES,
        Math.max(0, Math.trunc(persisted.remainingLives)),
      )
    : STARTING_LIVES;

  return (
    canonicalStatus(filledCount, { kind: "limited", remaining }, cells) !==
    "playing"
  );
}
