import type { Country } from "@/features/countries/types";
import { type ConstraintId, matchesConstraint } from "./constraints";

export type ValidationContext = {
  rowConstraintId: ConstraintId;
  colConstraintId: ConstraintId;
  country: Country;
  usedCountries: Set<string>;
};

export type ValidationResult =
  | { valid: true }
  | {
      valid: false;
      reason: GuessFailureReason;
    };

export type ConstraintFailureReason =
  | "wrong_row"
  | "wrong_col"
  | "wrong_constraints";

export type GuessFailureReason = ConstraintFailureReason | "already_used";

export type PublishedValidationContext = ValidationContext & {
  validCountryCodes: readonly string[];
};

export function isConstraintFailureReason(
  reason: string,
): reason is ConstraintFailureReason {
  return (
    reason === "wrong_row" ||
    reason === "wrong_col" ||
    reason === "wrong_constraints"
  );
}

export function validateGuess(ctx: ValidationContext): ValidationResult {
  if (ctx.usedCountries.has(ctx.country.iso3))
    return { valid: false, reason: "already_used" };
  const rowOk = matchesConstraint(ctx.rowConstraintId, ctx.country.iso3);
  const colOk = matchesConstraint(ctx.colConstraintId, ctx.country.iso3);
  if (!rowOk && !colOk) return { valid: false, reason: "wrong_constraints" };
  if (!rowOk) return { valid: false, reason: "wrong_row" };
  if (!colOk) return { valid: false, reason: "wrong_col" };
  return { valid: true };
}

/**
 * La liste publiée avec la grille est l'autorité stable. Les prédicats live ne
 * servent qu'à expliquer quelle contrainte a échoué lorsque le pays n'appartient
 * pas à ce snapshot.
 */
export function validatePublishedGuess(
  ctx: PublishedValidationContext,
): ValidationResult {
  if (ctx.usedCountries.has(ctx.country.iso3)) {
    return { valid: false, reason: "already_used" };
  }
  if (ctx.validCountryCodes.includes(ctx.country.iso3)) {
    return { valid: true };
  }

  const explanation = validateGuess({ ...ctx, usedCountries: new Set() });
  return explanation.valid
    ? { valid: false, reason: "wrong_constraints" }
    : explanation;
}
