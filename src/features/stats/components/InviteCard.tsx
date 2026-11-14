import { MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/LocaleContext";

/**
 * Sans compte : l'invitation du bas. Créer un compte et retrouver le sien
 * ouvrent la même fenêtre : il n'y a qu'un parcours.
 */
export function InviteCard({ onOpenAccount }: { onOpenAccount: () => void }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-low p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex items-start gap-3 sm:items-center">
        <MonitorSmartphone
          className="mt-0.5 size-5 shrink-0 text-brand sm:mt-0"
          aria-hidden
        />
        <p className="text-sm text-on-surface">{t("stats.inviteText")}</p>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-2">
        <Button
          type="button"
          onClick={onOpenAccount}
          className="w-full sm:w-auto"
        >
          {t("stats.inviteButton")}
        </Button>
        <Button
          type="button"
          variant="link"
          onClick={onOpenAccount}
          className="text-xs"
        >
          {t("stats.inviteExisting")}
        </Button>
      </div>
    </div>
  );
}
