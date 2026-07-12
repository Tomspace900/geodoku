// Animation du score de fin (pilotée par `useScoreAnimation`). Module pur :
// durées, courbe de défilement « compteur mécanique » et interpolation entière.
// Aucune dépendance React/Convex — testable en isolation.

/**
 * Durées (ms) de chaque tranche + pause entre tranches. Grille et rareté durent
 * autant (le gros de la révélation), les vies un peu moins ; pauses franches
 * pour laisser respirer. Total ≈ 3,3 s (1000 + 350 + 1000 + 350 + 600).
 */
export const ANIMATION_TIMING = {
  grid: 1000,
  rarity: 1000,
  lives: 600,
  pause: 350,
} as const;

/**
 * Fraction linéaire de chaque tranche : vitesse constante avant `LINEAR_PART`,
 * puis décélération finale. Donne le feeling « compteur qui roule puis freine »,
 * ≠ ease-out classique qui décélère dès la première frame.
 */
const LINEAR_PART = 0.7;
// Pente du segment linéaire, calibrée pour que l'aire totale (distance) vaille 1 :
//   s·p + (s/2)·(1−p) = 1  ⇒  s = 2/(1+p).
const SLOPE = 2 / (1 + LINEAR_PART);

/**
 * Courbe de défilement « compteur mécanique ». `t` (0..1) → progression (0..1).
 * Linéaire sur [0, LINEAR_PART] (pente SLOPE), puis quadratique décélérante
 * s'arrêtant à vitesse nulle en 1. Continue en position (C0), `f(0)=0`, `f(1)=1`,
 * monotone croissante.
 */
export function mechanicalEase(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  if (t <= LINEAR_PART) return SLOPE * t;
  // Reste de la tranche : u parcourt [0, 1] sur [LINEAR_PART, 1].
  const rest = 1 - LINEAR_PART;
  const u = (t - LINEAR_PART) / rest;
  // Intégrale d'une vitesse qui décroît linéairement de SLOPE à 0 : u − u²/2.
  return SLOPE * LINEAR_PART + SLOPE * rest * (u - (u * u) / 2);
}

/** Interpolation `from → to` selon une progression déjà lissée, arrondie à l'entier. */
export function countAt(
  from: number,
  to: number,
  easedProgress: number,
): number {
  return Math.round(from + (to - from) * easedProgress);
}
