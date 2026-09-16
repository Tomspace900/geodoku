import type { Locale } from "@/i18n";
import type { ConstraintId } from "../../../../content/constraints";
import { aboutForConstraint } from "../../../../content/constraints/abouts";
import { SOURCES } from "../../../../content/sources";

export type ConstraintSourceReference = Readonly<{
  name: string;
  url: string;
  vintage: string | null;
}>;

export type ConstraintSourceView = Readonly<{
  sources: readonly ConstraintSourceReference[];
  isConvention: boolean;
  clarification: string | null;
}>;

/**
 * Vue pure du toast de source d'une contrainte : sources (nom, millésime,
 * URL), mention de convention et clarification, dans la locale demandée.
 */
export function constraintSourceView(
  id: ConstraintId,
  locale: Locale,
): ConstraintSourceView {
  const about = aboutForConstraint(id);
  return {
    sources: about.sources.map((sourceId) => {
      const source = SOURCES[sourceId];
      return {
        name: source.name[locale],
        url: source.url,
        vintage: source.vintage ? source.vintage[locale] : null,
      };
    }),
    isConvention: about.basis === "convention",
    clarification: about.clarification ? about.clarification[locale] : null,
  };
}
