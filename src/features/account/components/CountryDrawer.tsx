import { Check, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SheetDrawer } from "@/components/SheetDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getCountryByIso3,
  searchCountries,
} from "@/features/countries/logic/search";
import { UI_ANIMATION_MS } from "@/features/game/logic/constants";
import { useLocale } from "@/i18n/LocaleContext";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { randomCountry, sortedCountries } from "../logic/countryPick";
import { DiceButton } from "./DiceButton";

/** Assez pour couvrir un nom tapé en entier, alias compris. */
const SEARCH_LIMIT = 20;

/**
 * « Mon pays » (#155) : un tiroir, même ouvert depuis la fenêtre de
 * bienvenue. Un dé, une recherche dès la première lettre (mêmes alias que la
 * saisie en jeu), le pays actuel en tête avec « Retirer », puis les 197 pays.
 */
export function CountryDrawer({
  open,
  current,
  onChoose,
  onClose,
}: {
  open: boolean;
  current: string | null;
  /** `null` : retirer le pays. */
  onChoose: (iso3: string | null) => void;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState("");
  const all = useMemo(() => sortedCountries(locale), [locale]);
  const searching = query.trim().length > 0;
  const results = searching ? searchCountries(query, SEARCH_LIMIT) : all;
  const chosen = current ? getCountryByIso3(current) : undefined;
  const rollRef = useRef<number | null>(null);

  function cancelRoll() {
    if (rollRef.current !== null) window.clearTimeout(rollRef.current);
    rollRef.current = null;
  }

  // Un tirage en cours ne survit pas au tiroir.
  useEffect(
    () => () => {
      if (rollRef.current !== null) window.clearTimeout(rollRef.current);
    },
    [],
  );

  function choose(iso3: string | null) {
    cancelRoll();
    setQuery("");
    onChoose(iso3);
  }

  // Le tiroir se ferme sur le pays tiré : on laisse d'abord le dé finir son tour.
  function draw() {
    const drawn = randomCountry(current);
    cancelRoll();
    rollRef.current = window.setTimeout(
      () => choose(drawn),
      prefersReducedMotion() ? 0 : UI_ANIMATION_MS.diceRoll,
    );
  }

  return (
    <SheetDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          cancelRoll();
          setQuery("");
          onClose();
        }
      }}
      title={t("account.myCountry")}
      subtitle={t("account.optional")}
      action={
        <DiceButton
          label={t("account.drawCountry")}
          onClick={draw}
          className="-mt-1"
        />
      }
      closeLabel={t("stats.closeDrawer")}
      tall
    >
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
    </SheetDrawer>
  );
}
