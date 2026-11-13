import { useState } from "react";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { Button } from "@/components/ui/button";
import { getCountryByIso3 } from "@/features/countries/logic/search";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { useBounce } from "../hooks/useBounce";
import { useOutsidePointer } from "../hooks/useOutsidePointer";
import { randomCountry, WHITE_FLAG } from "../logic/countryPick";
import { CountrySearch } from "./CountrySearch";
import { DiceButton } from "./DiceButton";

/**
 * Le pays, au même trait que le nom (« Ton pays » de la bienvenue, « Mon
 * pays » de « Mon compte ») : un tap change le champ en recherche, la liste
 * s'ouvre dessous, sur place. Un pays de la liste est posé et referme la
 * recherche ; le dé en pose un au hasard sans la fermer. Tap ailleurs ou
 * Échap : fermé sans changement. Le drapeau rebondit à chaque pays posé.
 */
export function CountryField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (iso3: string | null) => void;
}) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const country = value ? getCountryByIso3(value) : undefined;
  // Au niveau du champ : le drapeau change d'élément en s'ouvrant, son rebond
  // ne doit pas repartir pour autant.
  const bounce = useBounce(value);
  const ref = useOutsidePointer<HTMLDivElement>(open, () => setOpen(false));

  const flag = (
    <span
      key={bounce.key}
      aria-hidden
      className={cn(
        "inline-block origin-center text-xl leading-none",
        bounce.bouncing && "animate-flag-bounce",
      )}
    >
      {country?.flagEmoji ?? WHITE_FLAG}
    </span>
  );

  return (
    <div ref={ref} className="flex flex-col gap-1">
      <Eyebrow as="span">{label}</Eyebrow>
      {open ? (
        <CountrySearch
          current={value}
          leading={flag}
          onPick={(iso3) => {
            onChange(iso3);
            setOpen(false);
          }}
          onDraw={() => onChange(randomCountry(value))}
          onCancel={() => setOpen(false)}
        />
      ) : (
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => setOpen(true)}
            aria-label={`${label} : ${country ? country.names[locale] : t("account.noCountry")}`}
            className="flex h-11 w-full min-w-0 items-center justify-start gap-2.5 rounded-none border-b border-outline-variant/40 px-0 text-base font-normal text-on-surface hover:text-on-surface"
          >
            {flag}
            <span
              className={cn("truncate", !country && "text-on-surface-variant")}
            >
              {country ? country.names[locale] : t("account.noCountry")}
            </span>
          </Button>
          <DiceButton
            label={t("account.drawCountry")}
            onClick={() => onChange(randomCountry(value))}
          />
        </div>
      )}
    </div>
  );
}
