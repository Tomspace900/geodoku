import { Pencil } from "lucide-react";
import { DisplayHeader } from "@/components/editorial/DisplayHeader";
import { Button } from "@/components/ui/button";
import { WHITE_FLAG } from "@/features/account/logic/countryPick";
import { getCountryByIso3 } from "@/features/countries/logic/search";
import { useLocale } from "@/i18n/LocaleContext";

/**
 * Connecté, le titre de « Mes stats » devient le joueur : son drapeau
 * (tapable : « Mon pays », drapeau blanc sans pays) et son nom, avec un
 * crayon qui ouvre « Mon nom ». Le sous-titre redevient « Mes stats ».
 */
export function AccountTitle({
  pseudo,
  country,
  onEditName,
  onEditCountry,
}: {
  pseudo: string;
  country: string | null;
  onEditName: () => void;
  onEditCountry: () => void;
}) {
  const { t, locale } = useLocale();
  const chosen = country ? getCountryByIso3(country) : undefined;
  return (
    <DisplayHeader
      as="h1"
      size="lg"
      leftIcon={
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={onEditCountry}
          aria-label={
            chosen
              ? t("account.countryButton", { country: chosen.names[locale] })
              : t("account.chooseCountry")
          }
          className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-low text-2xl leading-none hover:bg-surface-highest/60"
        >
          <span aria-hidden>{chosen?.flagEmoji ?? WHITE_FLAG}</span>
        </Button>
      }
      title={
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 break-words">{pseudo}</span>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={onEditName}
            aria-label={t("account.editName")}
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
