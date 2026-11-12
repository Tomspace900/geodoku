import { Pencil } from "lucide-react";
import { DisplayHeader } from "@/components/editorial/DisplayHeader";
import { Button } from "@/components/ui/button";
import { useBounce } from "@/features/account/hooks/useBounce";
import { WHITE_FLAG } from "@/features/account/logic/countryPick";
import { getCountryByIso3 } from "@/features/countries/logic/search";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";

/**
 * Connecté, le titre de « Mes stats » devient le joueur : son drapeau
 * (drapeau blanc sans pays, simple affichage) et son nom, avec un crayon qui
 * ouvre « Mon compte ». Le sous-titre redevient « Mes stats ».
 */
export function AccountTitle({
  pseudo,
  country,
  onEdit,
}: {
  pseudo: string;
  country: string | null;
  onEdit: () => void;
}) {
  const { t, locale } = useLocale();
  const chosen = country ? getCountryByIso3(country) : undefined;
  // Le pays choisi ou tiré dans « Mon compte » se pose avec le rebond de la grille.
  const bouncing = useBounce(country);
  return (
    <DisplayHeader
      as="h1"
      size="lg"
      leftIcon={
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-low text-2xl leading-none">
          <span
            aria-hidden
            className={cn(
              "inline-block origin-center",
              bouncing && "animate-flag-bounce",
            )}
          >
            {chosen?.flagEmoji ?? WHITE_FLAG}
          </span>
          {chosen && (
            <span className="sr-only">
              {t("account.countryLabel", { country: chosen.names[locale] })}
            </span>
          )}
        </span>
      }
      title={
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 break-words">{pseudo}</span>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={onEdit}
            aria-label={t("account.editAccount")}
            className="shrink-0 p-1"
          >
            <Pencil className="!size-4" aria-hidden />
          </Button>
        </span>
      }
      eyebrow={t("stats.title")}
    />
  );
}
