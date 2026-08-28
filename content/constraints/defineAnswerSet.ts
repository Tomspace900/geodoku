import type { CountryCode } from "../countries/countryCodes";
import type { ConstraintAnswerSet } from "./type";

/** Fige l'identifiant en type littéral, pour que le registre puisse le vérifier. */
export function defineAnswerSet<const TId extends string>(
  id: TId,
  answers: readonly CountryCode[],
): ConstraintAnswerSet<TId> {
  return { id, answers };
}
