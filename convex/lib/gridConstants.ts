// Hard filters — validated empirically, non-negotiable
export const MIN_CELL_SIZE = 3;
export const MAX_CELL_SIZE = 15;
export const MIN_CATEGORIES = 4;
export const MAX_SAME_CATEGORY = 2;

/**
 * Anti-redundancy filter — keep a grid thematically varied.
 *
 * MAX_CONSTRAINT_OVERLAP: max overlap coefficient |A∩B|/min(|A|,|B|) allowed
 * between any two constraints of a grid. Bans quasi-synonym pairs where one
 * constraint nearly implies another ("Caribbean countries" × "bordered by the
 * Caribbean sea" ≈ 1.0, or nested thresholds like "larger than Mexico" ×
 * "larger than France"), which collapse a grid into a single theme. Unlike
 * MAX_SAME_CATEGORY (caps same *category*), this catches cross-category nesting
 * (subregion ⊆ continent, ocean ⊆ continent…). This is intra-grid redundancy —
 * unrelated to the pool-share throttling tried & reverted (see generateDiversePool).
 *
 * Symmetric by construction: it only forbids the *co-occurrence* of two near-
 * synonyms in one grid, never favouring one over the other — "larger than Mexico"
 * and "larger than France" each still seed their full quota of grids and the
 * scheduler alternates them. A grid-level countryPool floor was considered and
 * rejected (2026-06): it biased representation against *narrow* constraints
 * (whose grids naturally have smaller answer pools — India lost ~22% of its
 * grids) for a marginal gain, since this overlap cap alone already keeps pools
 * healthy. Equity between near-synonyms is the point — that's the challenge.
 *
 * Calibrated at 0.85 (not lower): it bans the genuine near-synonyms (Caribbean ×
 * Caribbean-coast = 1.0, Caribbean × North-America = 1.0, nested area/density/pop
 * thresholds = 1.0) while sparing merely-correlated-but-distinct axes (Caribbean
 * × island = 0.846, Portuguese × Atlantic = 0.78, Russian × Asia = 0.75).
 * Stricter values (0.7) over-starved narrow constraints — Caribbean, Portuguese,
 * Russian, polar dropped to 0–3 grids and the cold-start rollout could no longer
 * weave them in. Validate any change with `pnpm simulate:scheduling` (failed
 * seeds + cold-start checks).
 */
export const MAX_CONSTRAINT_OVERLAP = 0.85;

// Pool generation
export const TARGET_GRIDS_PER_SEED = 12;
export const MAX_ATTEMPTS_PER_SEED = 500;
export const MAX_OVERLAP_BETWEEN_GRIDS = 4; // out of 6 constraints
/**
 * Below this many grids, a seed is treated as structurally orphaned (failed):
 * the generator warns, the report flags it, and the simulation counts it as a
 * failed seed. Seeds with this many or more grids but fewer than a comfortable
 * yield are merely "low-yield" (informational). Single source of truth for the
 * failed/low-yield split across generator, report and simulation.
 */
export const MIN_VIABLE_GRIDS_PER_SEED = 5;

// Scheduler — sélection de la grille du lendemain
//
// Modèle : on ne limite PAS la réapparition d'une contrainte (au-delà du gap
// dur) — une contrainte peut revenir souvent tant que le CONTEXTE de grille
// change. On cible la non-redondance de grille via deux filtres durs + un seul
// scoring de chevauchement. Voir `selectNextGrid`.

/**
 * Fenêtre de redondance (jours) : portée du filtre de croisement éliminatoire ET
 * du malus de chevauchement. Sur cette fenêtre, aucun croisement (cellule) ne se
 * répète et le chevauchement de contraintes est minimisé. Sert aussi de fenêtre
 * d'analyse aux scripts de simulation/diagnostic. KNOWN_CONSTRAINT_WINDOW en dérive.
 */
export const HISTORY_WINDOW = 15;
/**
 * Espacement minimal (jours) entre deux apparitions d'une même contrainte —
 * filtre DUR. À 2, une contrainte vue la veille est exclue → jamais deux jours de
 * suite. Nécessaire : le scoring de chevauchement seul laisse une contrainte solo
 * revenir à J+1 (mesuré). `selectNextGrid` retombe sur l'ensemble complet si le
 * filtre vide la sélection.
 */
export const MIN_CONSTRAINT_GAP_DAYS = 2;
/**
 * Malus de chevauchement, indexé par le nombre de contraintes qu'une grille
 * candidate partage avec une grille de la fenêtre HISTORY_WINDOW. Le score d'une
 * grille = −Σ (sur les grilles de la fenêtre) OVERLAP_PENALTY[partagées], maximisé.
 * La croissance géométrique (4 ≫ 3 ≫ 2 ≫ 1) rend le pire chevauchement décisif :
 * minimiser le malus revient à choisir la grille la plus dissemblable des récentes
 * — ce qui assure à la fois la non-redondance et la rotation du catalogue. Indices
 * 0..6 ; 4+ partagées partagent le malus maximal (quasi rédhibitoire).
 */
export const OVERLAP_PENALTY = [0, 1, 8, 64, 512] as const;

/**
 * Bonus de fraîcheur, symétrique au malus : le score d'une grille =
 * Σ BONUS_TIERS[palier d'ancienneté] − malus de chevauchement. Le palier d'une
 * contrainte monte avec son ancienneté (jours depuis la dernière apparition) selon
 * BONUS_FRESHNESS_THRESHOLDS : une contrainte longtemps absente déclenche un bonus
 * croissant qui finit par compenser un malus → elle est « rappelée ». Borne ainsi
 * l'oubli (sans bonus une contrainte rare peut disparaître ~100 j ; ici ~37 j).
 * Échelle volontairement SOUS celle du malus (max 64 vs 512) : la non-redondance
 * reste prioritaire, le bonus ne fait que rééquilibrer la rotation. Indices 0..4.
 */
export const BONUS_TIERS = [0, 1, 4, 16, 64] as const;
/** Seuils d'ancienneté (jours) délimitant les paliers de BONUS_TIERS. */
export const BONUS_FRESHNESS_THRESHOLDS = [7, 14, 30, 45] as const;

/**
 * Cold-start guard — introduction graduelle des contraintes nouvellement ajoutées.
 * Une contrainte jamais vue ne partage rien → malus de chevauchement nul → les
 * grilles qui en concentrent plusieurs gagneraient et un lot entier débarquerait
 * d'un coup (mesuré : jusqu'à 4 nouvelles dans une grille). Le garde plafonne chaque
 * grille à MAX_NEW_CONSTRAINTS_PER_GRID « newcomer » — une contrainte absente de la
 * fenêtre KNOWN_CONSTRAINT_WINDOW (présence, pas comptage) — pour les tisser une par
 * une. Ne s'active qu'une fois l'historique mûr (≥ KNOWN_CONSTRAINT_WINDOW) ; un
 * historique plus court = seeding from-scratch, où tout est neuf et le cap est ignoré.
 */
export const MAX_NEW_CONSTRAINTS_PER_GRID = 1;
/** Trailing published grids that define "already established" (and the maturity gate). */
export const KNOWN_CONSTRAINT_WINDOW = HISTORY_WINDOW * 4;

// Auto-refill thresholds
export const POOL_LOW_THRESHOLD = 50;

export type PoolGridMetadata = {
  seedConstraint: string;
  constraintIds: string[];
  categories: string[];
  avgCellSize: number;
  minCellSize: number;
  countryPool: string[];
};

export type FinalizedPoolGrid = {
  rows: string[];
  cols: string[];
  validAnswers: Record<string, string[]>;
  metadata: PoolGridMetadata;
};

export type GenerationReport = {
  totalGenerated: number;
  seedResults: Array<{
    constraintId: string;
    attempted: number;
    succeeded: number;
    failed: boolean;
  }>;
  constraintCoverage: number;
  countryCoverage: number;
  durationMs: number;
};
