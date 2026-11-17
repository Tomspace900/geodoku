import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/LocaleContext";

/**
 * Le petit drapeau gris en haut à droite du tiroir de la grille solution
 * (#127) : discret, un geste rare. Libellé pour les lecteurs d'écran.
 */
export function ReportFlagButton({ onClick }: { onClick: () => void }) {
  const { t } = useLocale();
  return (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onClick}
      aria-label={t("report.entryLink")}
      title={t("report.entryLink")}
      className="size-8 shrink-0 rounded-md text-on-surface-variant hover:bg-surface-low hover:text-on-surface"
    >
      <Flag className="!size-4" aria-hidden />
    </Button>
  );
}
