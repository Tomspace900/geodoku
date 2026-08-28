import type { CountryCode } from "../countries/countryCodes";

export type ConstraintAnswerSet<TId extends string = string> = Readonly<{
  id: TId;
  answers: readonly CountryCode[];
}>;
