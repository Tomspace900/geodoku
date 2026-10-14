import type { CountryCode } from "../countries/countryCodes";
import type { SourceId } from "../sources";
import type { LocalizedString } from "../type";

export type ConstraintAnswerSet<TId extends string = string> = Readonly<{
  id: TId;
  answers: readonly CountryCode[];
}>;

/**
 * `"source"` exige au moins une source (donnée d'autorité recopiée telle
 * quelle). `"convention"` peut n'en citer aucune : l'appartenance à la liste
 * est alors un jugement éditorial Geodoku sans dataset externe, et le toast
 * n'affiche que la mention de convention (+ clarification éventuelle).
 */
export type ConstraintAboutSources =
  | { basis: "source"; sources: readonly [SourceId, ...SourceId[]] }
  | { basis: "convention"; sources: readonly SourceId[] };

export type ConstraintAbout<TId extends string = string> = Readonly<
  { id: TId; clarification: LocalizedString | null } & ConstraintAboutSources
>;
