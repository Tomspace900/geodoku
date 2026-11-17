import { SheetDrawer } from "@/components/SheetDrawer";
import { useLocale } from "@/i18n/LocaleContext";
import type { ReportCategory } from "../logic/report";
import type { ReportSendOutcome } from "../logic/submitOutcome";
import { ReportForm } from "./ReportForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialCategory: ReportCategory;
  onSubmit: (
    reportId: string,
    category: ReportCategory,
    message: string,
  ) => Promise<ReportSendOutcome>;
};

/**
 * Signalement hors de la grille solution (pied de page) : une saisie rapide,
 * donc un tiroir (règle des contenants, `docs/DESIGN_SYSTEM.md`). Sans case
 * ni contrainte : l'onglet « Réponse ou contrainte » renvoie vers la grille.
 */
export function ReportDrawer({
  open,
  onOpenChange,
  title,
  initialCategory,
  onSubmit,
}: Props) {
  const { t } = useLocale();
  return (
    <SheetDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      closeLabel={t("ui.closeDialog")}
    >
      <ReportForm
        initialCategory={initialCategory}
        hasGridTarget={false}
        onSubmit={onSubmit}
        onDone={() => onOpenChange(false)}
      />
    </SheetDrawer>
  );
}
