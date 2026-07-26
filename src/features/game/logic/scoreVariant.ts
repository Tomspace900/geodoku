import type {
  Cell,
  CellGuessDistribution,
  CellKey,
  GameState,
  RarityTier,
} from "../types";
import { RARITY_TIERS } from "./constants";
import { livesCapacity, scoreLives } from "./lives";
import { filledCellShare } from "./rarity";

// Score de fin de partie — additif, en points. Trois parts :
//   grille (cases remplies) + rareté (cumulée, cases vides = 0) + vies restantes.
// Barème tranché le 2026-07-10, calibré sur données réelles. La rareté s'appuie sur la
// part brute du jour (cohorte, coup du joueur inclus, cf. `rarity.ts`) — une seule base
// partout : score, cases, emojis et grille solution s'accordent.

/** Points gagnés en remplissant une case (max 9 × 50 = 450). */
const GRID_PER_CELL = 50;
/** Points de rareté max par case, atteints dès qu'un pick est ultra (max 9 × 50 = 450). */
const RARITY_PER_CELL = 50;
/** Points par vie restante (max 5 × 20 = 100). Total max = 1000. */
const LIVES_PER_LIFE = 20;

/** Part au-delà de laquelle un pick est trop commun pour rapporter quoi que ce soit. */
const RARITY_ZERO_SHARE = 0.6;

/**
 * Courbe de rareté : **plein crédit dès qu'un pick est ultra** (part ≤ la frontière
 * ultra `RARITY_TIERS.rare` = 0,1), puis décroissance linéaire jusqu'à 0 à
 * `RARITY_ZERO_SHARE` (0,6). Un pays très commun (part ≥ 0,6) ne rapporte rien ; un
 * commun proche du seuil, une miette. Part (0..1) → fraction de `RARITY_PER_CELL` (0..1).
 */
const rarityFraction = (share: number): number =>
  Math.max(
    0,
    Math.min(
      1,
      (RARITY_ZERO_SHARE - share) / (RARITY_ZERO_SHARE - RARITY_TIERS.rare),
    ),
  );

// ── Décomposition de la partie ───────────────────────────────────────────────

/**
 * Ingrédients bruts du score : les **parts brutes** (cohorte) par case remplie (`null`
 * tant que la distribution charge), le nombre de cases remplies et les vies. `estimated`
 * = au moins une case a trop peu de soumissions (rareté provisoire, s'affinera).
 * `filledCount`/`lives` sont connus d'emblée — seule la rareté est en attente.
 */
export type ScoreBreakdown = {
  shares: number[] | null;
  estimated: boolean;
  filledCount: number;
  lives: number;
  /**
   * Vies maximales du mode : `STARTING_LIVES` en daily, **0 en entraînement**
   * (essais illimités → la part vies n'existe pas). Une seule formule, deux
   * échelles : le total plafonne à 1000 en daily et à 900 en entraînement.
   */
  livesCapacity: number;
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
    const resolved = filledCellShare(cell.countryCode, distribution?.[key]);
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
    lives: scoreLives(state.lives),
    livesCapacity: livesCapacity(state.lives),
  };
}

/**
 * Tier « couleur » de l'arc : le tier dont la borne de part contient la fraction
 * moyenne `f`. Les bornes sont `rarityFraction` évaluée aux frontières de tier —
 * donc **auto-cohérentes avec la courbe** (elle change, les bandes suivent). Une
 * grille 100 % commune (f ≈ 0) → `common`, cohérent avec des carrés 🟪.
 */
function tierFromFraction(f: number): RarityTier {
  if (f < rarityFraction(RARITY_TIERS.common)) return "common";
  if (f < rarityFraction(RARITY_TIERS.uncommon)) return "uncommon";
  if (f < rarityFraction(RARITY_TIERS.rare)) return "rare";
  return "ultra";
}

/**
 * Tier « couleur » de l'arc rareté. Dérivé de la **fraction de rareté moyenne**
 * (la grandeur même que l'arc mesure), et non de la moyenne des parts brutes :
 * couleur et nombre affiché restent cohérents (à points par case égaux, couleur
 * égale), et une seule case très commune ne fait plus basculer toute la couronne.
 */
export function averageRarityTier(shares: number[]): RarityTier {
  if (shares.length === 0) return "common";
  const avgFraction =
    shares.reduce((acc, share) => acc + rarityFraction(share), 0) /
    shares.length;
  return tierFromFraction(avgFraction);
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
  livesCapacity,
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
    livesMax: LIVES_PER_LIFE * livesCapacity,
  };
}
