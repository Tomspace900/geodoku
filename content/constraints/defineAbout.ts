import type { LocalizedString } from "../type";
import type { ConstraintAbout, ConstraintAboutSources } from "./type";

/** Fige l'identifiant en type littéral, sur le patron de `defineAnswerSet`. */
export function defineAbout<const TId extends string>(
  id: TId,
  about: ConstraintAboutSources & { clarification: LocalizedString | null },
): ConstraintAbout<TId> {
  return { id, ...about };
}
