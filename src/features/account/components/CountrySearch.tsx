import { Check, Search } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchCountries } from "@/features/countries/logic/search";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { NO_PASSWORD_MANAGER } from "../logic/autofill";
import { sortedCountries, WHITE_FLAG } from "../logic/countryPick";

/** Assez pour couvrir un nom tapé en entier, alias compris. */
const SEARCH_LIMIT = 20;

function Row({
  flag,
  label,
  selected,
  muted = false,
  onClick,
}: {
  flag: string;
  label: string;
  selected: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-left font-normal hover:bg-surface-lowest hover:text-on-surface",
        selected && "bg-surface-lowest",
      )}
    >
      <span aria-hidden className="text-xl leading-none">
        {flag}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          muted ? "text-on-surface-variant" : "text-on-surface",
        )}
      >
        {label}
      </span>
      {selected && <Check className="!size-4 text-brand" aria-hidden />}
    </Button>
  );
}

/**
 * Le pays cherché sur place (#155), le même partout (titre de « Mes stats »,
 * « Mon compte », bienvenue) : la recherche dès la première lettre (mêmes
 * alias que la saisie en jeu), et la liste dessous dans un encart haut
 * d'environ 6 lignes, pour tenir au-dessus du clavier. Sans recherche :
 * « Aucun » en tête, puis les 197 pays. La liste ne prend pas le focus du
 * champ.
 */
export function CountrySearch({
  current,
  onPick,
  onCancel,
  before,
  leading,
}: {
  current: string | null;
  /** Un pays de la liste (`null` : aucun). */
  onPick: (iso3: string | null) => void;
  /** Échap. */
  onCancel: () => void;
  /** En tête de ligne, hors du champ (le drapeau du titre). */
  before?: ReactNode;
  /** Dans le champ, à gauche ; une loupe par défaut. */
  leading?: ReactNode;
}) {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState("");
  const all = useMemo(() => sortedCountries(locale), [locale]);
  const searching = query.trim().length > 0;
  const results = searching ? searchCountries(query, SEARCH_LIMIT) : all;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        {before}
        <div className="relative min-w-0 flex-1">
          <span
            aria-hidden
            className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center text-on-surface-variant"
          >
            {leading ?? <Search className="size-4" />}
          </span>
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onCancel();
              }
              // Entrée : le premier pays trouvé.
              if (event.key === "Enter" && searching && results[0]) {
                event.preventDefault();
                onPick(results[0].iso3);
              }
            }}
            placeholder={t("account.searchCountry")}
            aria-label={t("account.searchCountry")}
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            {...NO_PASSWORD_MANAGER}
            className={cn("h-11 text-base", leading ? "pl-9" : "pl-6")}
          />
        </div>
      </div>
      {/* Garde le focus du champ : le clavier ne se ferme pas avant le choix. */}
      <ul
        onMouseDown={(event) => event.preventDefault()}
        className="mt-2 flex max-h-[228px] flex-col gap-0.5 overflow-y-auto rounded-xl bg-surface-low p-1"
      >
        {!searching && (
          <li>
            <Row
              flag={WHITE_FLAG}
              label={t("account.noCountry")}
              muted
              selected={current === null}
              onClick={() => onPick(null)}
            />
          </li>
        )}
        {results.map((country) => (
          <li key={country.iso3}>
            <Row
              flag={country.flagEmoji}
              label={country.names[locale]}
              selected={country.iso3 === current}
              onClick={() => onPick(country.iso3)}
            />
          </li>
        ))}
        {searching && results.length === 0 && (
          <li className="px-3 py-3 text-sm text-on-surface-variant">
            {t("account.noCountryFound")}
          </li>
        )}
      </ul>
    </div>
  );
}
