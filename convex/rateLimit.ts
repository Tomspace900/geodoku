import { DAY, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

/**
 * Limites des écritures publiques (#70).
 *
 * - Création d'une partie anonyme : clé `clientId` (UUID du localStorage), seul
 *   usage qui lui reste. 1 par minute et 3 par jour et par navigateur : un
 *   joueur n'en crée qu'une par jour, la marge couvre un stockage vidé.
 * - Coups et note : clé hash du jeton de la partie. Une partie compte au plus
 *   14 coups ; le seau absorbe les renvois d'un client qui a perdu ses accusés.
 *
 * Pas une barrière contre un attaquant qui change de clé à chaque appel, mais
 * de quoi arrêter un script naïf et plafonner la facture. La table du
 * composant ne s'efface jamais seule : `health.purgeRateLimits` la vide.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  createGamePerMinute: {
    kind: "token bucket",
    rate: 1,
    period: MINUTE,
    capacity: 1,
  },
  createGamePerDay: { kind: "token bucket", rate: 3, period: DAY, capacity: 3 },
  move: { kind: "token bucket", rate: 30, period: MINUTE, capacity: 30 },
});
