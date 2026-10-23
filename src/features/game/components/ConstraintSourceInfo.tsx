import { Button } from "@/components/ui/button";
import { constraintSourceView } from "@/features/game/logic/constraintSource";
import type { ConstraintId } from "@/features/game/logic/constraints";
import { useLocale } from "@/i18n/LocaleContext";

type Props = {
  constraintId: ConstraintId;
};

/**
 * Corps du toast de source d'une contrainte (lot 1) : sources avec liens et
 * millésime, arbitrage Geodoku (compté comme une source), clarification.
 * Extrait pour être partagé avec le Drawer de contrainte de la grille solution (lot 2), qui affiche la
 * même vue pure (`constraintSourceView`) sous son titre plutôt que dans un
 * toast flottant.
 */
export function ConstraintSourceInfo({ constraintId }: Props) {
  const { locale, t } = useLocale();
  const view = constraintSourceView(constraintId, locale);
  // L'arbitrage maison compte comme une source : il fait passer le préfixe au pluriel.
  const sourceCount = view.sources.length + (view.isConvention ? 1 : 0);
  return (
    <>
      <p className="font-sans text-xs text-on-surface-variant">
        {t(
          sourceCount > 1
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
          <span>
            {view.sources.length > 0 && ", "}
            {t("ui.constraintSourceConvention")}
          </span>
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
