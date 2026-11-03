import { v } from "convex/values";

/**
 * Validateurs partagés par le schéma et les fonctions. Module feuille : le
 * schéma l'importe, il ne peut donc rien importer qui dépende de `_generated`.
 */
export const ratingValidator = v.union(
  v.literal("too_easy"),
  v.literal("balanced"),
  v.literal("too_hard"),
);
