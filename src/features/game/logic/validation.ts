import type { Country } from "@/features/countries/types";
import { CONSTRAINTS, type ConstraintId } from "./constraints";

export type ValidationContext = {
  rowConstraintId: ConstraintId;
  colConstraintId: ConstraintId;
  country: Country;
  usedCountries: Set<string>;
};

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: "wrong_row" | "wrong_col" | "already_used" };

export function validateGuess(ctx: ValidationContext): ValidationResult {
  if (ctx.usedCountries.has(ctx.country.code))
    return { valid: false, reason: "already_used" };
  const rowC = CONSTRAINTS.find((c) => c.id === ctx.rowConstraintId);
  const colC = CONSTRAINTS.find((c) => c.id === ctx.colConstraintId);
  if (!rowC || !colC) throw new Error("Unknown constraint id");
  if (!rowC.predicate(ctx.country))
    return { valid: false, reason: "wrong_row" };
  if (!colC.predicate(ctx.country))
    return { valid: false, reason: "wrong_col" };
  return { valid: true };
}
