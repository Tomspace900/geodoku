import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/LocaleContext";
import { StatsSection } from "./StatsSection";

/**
 * « Mon compte › » : une ligne avec l'e-mail, qui ouvre le tiroir du compte.
 * La suppression reste ainsi loin du pouce qui défile.
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
        className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface-low px-4 py-3 font-normal hover:bg-surface-highest/50 hover:text-on-surface"
      >
        <span className="truncate text-sm text-on-surface-variant">
          {email}
        </span>
        <ChevronRight
          className="!size-4 shrink-0 text-on-surface-variant"
          aria-hidden
        />
      </Button>
    </StatsSection>
  );
}
