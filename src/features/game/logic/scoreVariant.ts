import type {
  Cell,
  CellGuessDistribution,
  CellKey,
  GameState,
  RarityTier,
} from "../types";
import { RARITY_TIERS, STARTING_LIVES } from "./constants";
import { playerLeaveOneOutShare, rarityToTier } from "./rarity";

// Score de fin de partie — additif, en points. Trois parts :
//   grille (cases remplies) + rareté (cumulée, cases vides = 0) + vies restantes.
// Barème tranché le 2026-07-10, calibré sur données réelles. La rareté s'appuie sur la part
// des **autres** joueurs (leave-one-out, cf. `rarity.ts`) — continue et fine.

/** Points gagnés en remplissant une case (max 9 × 50 = 450). */
const GRID_PER_CELL = 50;
/** Points de rareté qu'une case peut rapporter au maximum, part → 0 (max 9 × 50 = 450). */
const RARITY_PER_CELL = 50;
/** Points par vie restante (max 5 × 20 = 100). Total max = 1000. */
const LIVES_PER_LIFE = 20;

/**
 * Courbe de rareté « commonZero » : une case commune (choisie par > 50 % des joueurs)
 * ne rapporte aucun bonus ; sous 50 %, chaque point de part en moins vaut le double.
 * Part des joueurs (0..1) → fraction de `RARITY_PER_CELL` gagnée (0..1).
 */
const rarityFraction = (share: number): number =>
  Math.max(0, Math.min(1, (RARITY_TIERS.common - share) / RARITY_TIERS.common));

// ── Décomposition de la partie ───────────────────────────────────────────────

/**
 * Ingrédients bruts du score : les **parts leave-one-out** par case remplie (`null`
 * tant que la distribution charge), le nombre de cases remplies et les vies. `estimated`
 * = au moins une case a trop peu de soumissions (rareté provisoire, s'affinera).
 * `filledCount`/`lives` sont connus d'emblée — seule la rareté est en attente.
 */
export type ScoreBreakdown = {
  shares: number[] | null;
  estimated: boolean;
  filledCount: number;
  lives: number;
};

export function computeScoreBreakdown(
  state: GameState,
  distribution: Record<string, CellGuessDistribution> | undefined,
): ScoreBreakdown {
  const shares: number[] = [];
  let filledCount = 0;
  let pending = false;
  let estimated = false;
  for (const [key, cell] of Object.entries(state.cells) as [CellKey, Cell][]) {
    if (cell.status !== "filled") continue;
    filledCount++;
    const resolved = playerLeaveOneOutShare(
      cell.countryCode,
      distribution?.[key],
    );
    if (resolved === null) {
      pending = true;
      continue;
    }
    shares.push(resolved.share);
    if (resolved.estimated) estimated = true;
  }
  return {
    shares: pending ? null : shares,
    estimated,
    filledCount,
    lives: state.remainingLives,
  };
}

/** Tier « couleur » de l'arc rareté : le tier de la part moyenne des autres joueurs. */
export function averageRarityTier(shares: number[]): RarityTier {
  if (shares.length === 0) return "common";
  const avgShare = shares.reduce((a, b) => a + b, 0) / shares.length;
  return rarityToTier(avgShare);
}

// ── Calcul du score (3 parts : grille + rareté + vies) ───────────────────────

export type ScoreResult = {
  /** Total affiché au centre. `null` tant que la rareté charge. */
  total: number | null;
  /** Grille (anneau central) = cases uniquement. */
  gridValue: number;
  gridMax: number;
  /** Rareté (arc 1 de la couronne) — cumulée, cases vides = 0. `null` tant qu'elle charge. */
  rarityValue: number | null;
  rarityMax: number;
  /** Vies restantes (arc 2 de la couronne) — connues d'emblée. */
  livesValue: number;
  livesMax: number;
};

export function computeScore({
  shares,
  filledCount,
  lives,
}: ScoreBreakdown): ScoreResult {
  // Cumulée : chaque case remplie rapporte sa rareté, une case vide vaut 0.
  // Arrondi une seule fois, sur la somme, pour ne pas perdre de résolution.
  const rarityValue =
    shares === null
      ? null
      : Math.round(
          shares.reduce((acc, share) => acc + rarityFraction(share), 0) *
            RARITY_PER_CELL,
        );

  const gridValue = GRID_PER_CELL * filledCount;
  const livesValue = LIVES_PER_LIFE * lives;

  return {
    total: rarityValue === null ? null : gridValue + rarityValue + livesValue,
    gridValue,
    gridMax: GRID_PER_CELL * 9,
    rarityValue,
    rarityMax: RARITY_PER_CELL * 9,
    livesValue,
    livesMax: LIVES_PER_LIFE * STARTING_LIVES,
  };
}
