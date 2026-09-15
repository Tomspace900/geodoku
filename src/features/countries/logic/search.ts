import { matchSorter, rankings } from "match-sorter";
import type { Country } from "@/features/countries/types";
import { COUNTRY_CATALOG } from "../../../../content/countries/catalog";

const TYPED: readonly Country[] = COUNTRY_CATALOG;

// Normalise: lowercase + strip accents (NFD + remove combining marks) + hyphens as spaces
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[\u002D\u2010-\u2015]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type IndexedCountry = Country & { _normalized: string[] };

function buildSearchTokens(c: Country): string[] {
  const raw = [c.iso2, c.iso3, c.names.fr, c.names.en, ...c.aliases];
  return [...new Set(raw.map(normalize).filter((token) => token.length > 0))];
}

const INDEX: IndexedCountry[] = TYPED.map((c) => ({
  ...c,
  _normalized: buildSearchTokens(c),
}));

export function searchCountries(query: string, limit = 8): Country[] {
  const q = normalize(query);
  if (!q) return [];
  return matchSorter(INDEX, q, {
    keys: ["_normalized"],
    threshold: rankings.CONTAINS,
  }).slice(0, limit);
}

export function getCountryByIso3(iso3: string): Country | undefined {
  return TYPED.find((c) => c.iso3 === iso3);
}
