import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getCountryByIso3,
  searchCountries,
} from "@/features/countries/logic/search";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { sortedCountries } from "../logic/countryPick";

/** Assez pour couvrir un nom tapé en entier, alias compris. */
const SEARCH_LIMIT = 20;

/**
 * La liste des pays (#155), dans le tiroir de la bienvenue comme dans
 * « Mon compte » : une recherche dès la première lettre (mêmes alias que la
 * saisie en jeu), le pays actuel en tête avec « Retirer », puis les 197 pays.
 */
export function CountryPicker({
  current,
  onChoose,
}: {
  current: string | null;
  /** `null` : retirer le pays. */
  onChoose: (iso3: string | null) => void;
}) {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState("");
  const all = useMemo(() => sortedCountries(locale), [locale]);
  const searching = query.trim().length > 0;
  const results = searching ? searchCountries(query, SEARCH_LIMIT) : all;
  const chosen = current ? getCountryByIso3(current) : undefined;

  function choose(iso3: string | null) {
    setQuery("");
    onChoose(iso3);
  }

  return (
    <>
      <div className="relative mt-2">
        <Search
          className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("account.searchCountry")}
          aria-label={t("account.searchCountry")}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-11 pl-6 text-base"
        />
      </div>
      {chosen && !searching && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface-low px-3 py-2.5">
          <span className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="text-xl leading-none">
              {chosen.flagEmoji}
            </span>
            <span className="truncate text-sm font-medium text-on-surface">
              {chosen.names[locale]}
            </span>
          </span>
          <Button
            type="button"
            variant="link"
            onClick={() => choose(null)}
            className="shrink-0 text-xs"
          >
            {t("account.removeCountry")}
          </Button>
        </div>
      )}
      <ul className="-mx-2 mt-3 flex flex-col gap-0.5 pb-2">
        {results.map((country) => {
          const selected = country.iso3 === current;
          return (
            <li key={country.iso3}>
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={() => choose(country.iso3)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2.5 text-left font-normal hover:bg-surface-low hover:text-on-surface",
                  selected && "bg-surface-low",
                )}
              >
                <span aria-hidden className="text-xl leading-none">
                  {country.flagEmoji}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-on-surface">
                  {country.names[locale]}
                </span>
                {selected && (
                  <Check className="!size-4 text-brand" aria-hidden />
                )}
              </Button>
            </li>
          );
        })}
      </ul>
      {searching && results.length === 0 && (
        <p className="py-6 text-center text-sm text-on-surface-variant">
          {t("account.noCountryFound")}
        </p>
      )}
    </>
  );
}
