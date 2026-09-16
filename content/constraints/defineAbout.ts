import type { SourceId } from "../sources";
import type { ContentBasis, LocalizedString } from "../type";
import type { ConstraintAbout } from "./type";

/** Fige l'identifiant en type littéral, sur le patron de `defineAnswerSet`. */
export function defineAbout<const TId extends string>(
  id: TId,
  about: {
    sources: readonly [SourceId, ...SourceId[]];
    basis: ContentBasis;
    clarification: LocalizedString | null;
  },
): ConstraintAbout<TId> {
  return { id, ...about };
}
