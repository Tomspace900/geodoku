import { v } from "convex/values";

/**
 * Formes de résultat des écritures idempotentes, partagées entre le schéma de
 * `operationReceipts` et les validateurs `returns:` des mutations. Module
 * feuille sans import : le schéma le consomme, donc il ne peut rien importer
 * qui dépende de `_generated`.
 *
 * Chaque mutation déclare le sous-ensemble qu'elle peut réellement renvoyer, et
 * non l'union complète : c'est ce resserrement qui fait du `returns:` un
 * contrat plutôt qu'une paraphrase du type.
 */
export const acceptedGuessResult = v.object({
  kind: v.literal("accepted"),
  count: v.number(),
  total: v.number(),
  rarity: v.number(),
});

export const domainRejectedResult = v.object({
  kind: v.literal("domain_rejected"),
  reason: v.literal("invalid_guess"),
});

export const recordedResult = v.object({ kind: v.literal("recorded") });

/** Union stockée dans `operationReceipts.result`. */
export const operationResultValidator = v.union(
  acceptedGuessResult,
  domainRejectedResult,
  recordedResult,
);

/** Retour de `submitTodayGuess` : jamais `recorded`. */
export const submitGuessResult = v.union(
  acceptedGuessResult,
  domainRejectedResult,
);
