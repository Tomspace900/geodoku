import { ChevronDown } from "lucide-react";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { Button } from "@/components/ui/button";
import { getCountryByIso3 } from "@/features/countries/logic/search";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { useBounce } from "../hooks/useBounce";
import { WHITE_FLAG } from "../logic/countryPick";
import { DiceButton } from "./DiceButton";

/**
 * Le pays dans la bienvenue : un champ de choix au même trait que le nom,
 * qui ouvre la liste en tiroir ; le dé, à droite, tire un pays au hasard.
 */
export function CountryField({
  label,
  value,
  onOpen,
  onDraw,
}: {
  label: string;
  value: string | null;
  onOpen: () => void;
  onDraw: () => void;
}) {
  const { t, locale } = useLocale();
  const country = value ? getCountryByIso3(value) : undefined;
  const bouncing = useBounce(value);
  return (
    <div className="flex flex-col gap-1">
      <Eyebrow as="span">{label}</Eyebrow>
      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={onOpen}
          aria-label={`${label} : ${country ? country.names[locale] : t("account.noCountry")}`}
          className="flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-none border-b border-outline-variant/40 px-0 text-base font-normal text-on-surface hover:text-on-surface"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className={cn(
                "inline-block origin-center text-xl leading-none",
                bouncing && "animate-flag-bounce",
              )}
            >
              {country?.flagEmoji ?? WHITE_FLAG}
            </span>
            <span
              className={cn("truncate", !country && "text-on-surface-variant")}
            >
              {country ? country.names[locale] : t("account.noCountry")}
            </span>
          </span>
          <ChevronDown
            className="!size-4 shrink-0 text-on-surface-variant"
            aria-hidden
          />
        </Button>
        <DiceButton label={t("account.drawCountry")} onClick={onDraw} />
      </div>
    </div>
  );
}
