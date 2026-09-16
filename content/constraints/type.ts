import type { CountryCode } from "../countries/countryCodes";
import type { SourceId } from "../sources";
import type { ContentBasis, LocalizedString } from "../type";

export type ConstraintAnswerSet<TId extends string = string> = Readonly<{
  id: TId;
  answers: readonly CountryCode[];
}>;

export type ConstraintAbout<TId extends string = string> = Readonly<{
  id: TId;
  sources: readonly [SourceId, ...SourceId[]];
  basis: ContentBasis;
  clarification: LocalizedString | null;
}>;
