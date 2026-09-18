import { Button } from "@/components/ui/button";
import { constraintSourceView } from "@/features/game/logic/constraintSource";
import type { ConstraintId } from "@/features/game/logic/constraints";
import type { Locale, TKey } from "@/i18n/types";

type TranslateFn = (
  key: TKey,
  vars?: Record<string, string | number>,
) => string;

type Props = {
  constraintId: ConstraintId;
  locale: Locale;
  t: TranslateFn;
};

/**
 * Corps du toast de source d'une contrainte (lot 1) : sources avec liens et
 * millésime, mention de convention, clarification. Extrait pour être partagé
 * avec le Drawer de contrainte de la grille solution (lot 2), qui affiche la
 * même vue pure (`constraintSourceView`) sous son titre plutôt que dans un
 * toast flottant.
 */
export function ConstraintSourceInfo({ constraintId, locale, t }: Props) {
  const view = constraintSourceView(constraintId, locale);
  return (
    <>
      <p className="font-sans text-xs text-on-surface-variant">
        {view.sources.length > 0 ? (
          <>
            {t(
              view.sources.length > 1
                ? "ui.constraintSourcesPrefix"
                : "ui.constraintSourcePrefix",
            )}{" "}
            {view.sources.map((source, index) => (
              <span key={source.id}>
                {index > 0 && ", "}
                <Button
                  asChild
                  variant="link"
                  className="text-xs text-on-surface-variant"
                >
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.name}
                  </a>
                </Button>
                {source.vintage ? ` (${source.vintage})` : ""}
              </span>
            ))}
            {view.isConvention && (
              <span> — {t("ui.constraintSourceConvention")}</span>
            )}
          </>
        ) : (
          t("ui.constraintSourceConvention")
        )}
      </p>

      {view.clarification && (
        <p className="mt-1 font-sans text-xs text-on-surface-variant">
          {view.clarification}
        </p>
      )}
    </>
  );
}
