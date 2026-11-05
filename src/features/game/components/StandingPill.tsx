import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/LocaleContext";

type Props = {
  /** `null` : cohorte mince, « Parmi les premiers à finir ». */
  percent: number | null;
  onClick: () => void;
};

/**
 * Pilule « Mieux que X % des joueurs › » de la modale de résultat (#70), pour
 * tout le monde, sans règle sous la médiane. Un tap fait glisser vers le
 * graphique. Le nombre de joueurs n'apparaît jamais.
 */
export function StandingPill({ percent, onClick }: Props) {
  const t = useT();
  const [before, after = ""] = t("ui.betterThan").split("{percent}");

  return (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onClick}
      className="mx-auto flex w-fit items-center gap-1 rounded-full bg-surface-low px-4 py-2 text-sm font-normal text-on-surface hover:bg-surface-highest/50 hover:text-on-surface"
    >
      {percent === null ? (
        t("ui.amongFirstToFinish")
      ) : (
        <span>
          {before}
          <span className="font-medium text-brand">{`${percent}%`}</span>
          {after}
        </span>
      )}
      <ChevronRight className="size-4 text-on-surface-variant" aria-hidden />
    </Button>
  );
}
