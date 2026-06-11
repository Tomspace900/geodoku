import type { Country } from "@/features/countries/types";
import { CONSTRAINT_BY_ID, type ConstraintId } from "./constraints";

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
  if (ctx.usedCountries.has(ctx.country.code))
    return { valid: false, reason: "already_used" };
  const rowC = CONSTRAINT_BY_ID.get(ctx.rowConstraintId);
  const colC = CONSTRAINT_BY_ID.get(ctx.colConstraintId);
  if (!rowC || !colC) throw new Error("Unknown constraint id");
  const rowOk = rowC.predicate(ctx.country);
  const colOk = colC.predicate(ctx.country);
  if (!rowOk && !colOk) return { valid: false, reason: "wrong_constraints" };
  if (!rowOk) return { valid: false, reason: "wrong_row" };
  if (!colOk) return { valid: false, reason: "wrong_col" };
  return { valid: true };
}
