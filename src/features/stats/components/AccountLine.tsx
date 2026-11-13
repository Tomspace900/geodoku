import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/LocaleContext";
import { StatsSection } from "./StatsSection";

/**
 * « Mon compte › » : l'e-mail dans un encart gris, qui ouvre le tiroir du
 * compte (seule entrée vers lui). La suppression reste ainsi loin du pouce
 * qui défile. Le chevron du titre de section suffit : pas de flèche à droite.
 */
export function AccountLine({
  email,
  onOpen,
}: {
  email: string;
  onOpen: () => void;
}) {
  const { t } = useLocale();
  return (
    <StatsSection title={t("stats.myAccount")} onOpen={onOpen}>
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={onOpen}
        className="flex w-full items-center justify-start rounded-xl bg-surface-low px-4 py-3 font-normal hover:bg-surface-highest/50 hover:text-on-surface"
      >
        <span className="truncate text-sm text-on-surface-variant">
          {email}
        </span>
      </Button>
    </StatsSection>
  );
}
