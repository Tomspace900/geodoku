import { X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { useConstraintSourceToast } from "@/features/game/hooks/useConstraintSourceToast";
import { CONSTRAINT_BY_ID } from "@/features/game/logic/constraints";
import { useLocale } from "@/i18n/LocaleContext";
import { ConstraintSourceInfo } from "./ConstraintSourceInfo";

type Props = {
  toast: ReturnType<typeof useConstraintSourceToast>;
};

/**
 * Toast flottant affichant la source d'une contrainte, ou l'explication d'une
 * case bloquée (#60). Rendu une fois par
 * page (`GamePage`, `TrainingPage`), **en jeu uniquement** : sur la grille
 * solution, l'en-tête ouvre le Drawer de contrainte à la place (lot 2).
 * `pointer-events-none` sur le conteneur pour ne jamais bloquer une case ;
 * `pointer-events-auto` sur le toast lui-même.
 */
export function ConstraintSourceToast({ toast }: Props) {
  const { t } = useLocale();
  const { active, close, pause, resume } = toast;

  useEffect(() => {
    if (!active) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, close]);

  if (!active) return null;

  const constraint =
    active.kind === "constraint"
      ? CONSTRAINT_BY_ID.get(active.constraintId)
      : undefined;
  const label =
    active.kind === "blockedCell"
      ? t("ui.blockedCellTitle")
      : constraint
        ? t(constraint.labelKey)
        : active.constraintId;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        role="status"
        aria-live="polite"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocus={pause}
        onBlur={resume}
        className="pointer-events-auto w-full max-w-sm rounded-xl bg-surface-lowest p-3 shadow-editorial"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-sans text-xs font-semibold text-on-surface">
            {label}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={close}
            aria-label={t("ui.closeDialog")}
            className="shrink-0 p-1 text-on-surface-variant hover:text-on-surface"
          >
            <X size={14} />
          </Button>
        </div>

        <div className="mt-1">
          {active.kind === "constraint" ? (
            <ConstraintSourceInfo constraintId={active.constraintId} />
          ) : (
            <p className="font-sans text-xs text-on-surface-variant">
              {t("ui.blockedCellBody")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
