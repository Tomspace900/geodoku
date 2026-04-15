import countriesJson from "@/features/countries/data/countries.json";
import type { Country } from "@/features/countries/types";
import type { Locale } from "@/i18n/types";
import { matchSorter, rankings } from "match-sorter";

const TYPED = countriesJson as Country[];

// Normalise: lowercase + strip accents (NFD + remove combining marks)
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .trim();
}

// Pre-computed locale-specific indexes to avoid recomputing on every keystroke
type IndexedCountry = Country & { _normalized: string[] };

function buildIndex(locale: Locale): IndexedCountry[] {
  return TYPED.map((c) => ({
    ...c,
    _normalized: [
      normalize(c.names[locale]),
      ...c.aliases[locale].map(normalize),
      c.code.toLowerCase(),
    ],
  }));
}

const INDEX_FR: IndexedCountry[] = buildIndex("fr");
const INDEX_EN: IndexedCountry[] = buildIndex("en");

function getIndex(locale: Locale): IndexedCountry[] {
  return locale === "fr" ? INDEX_FR : INDEX_EN;
}

export function searchCountries(
  query: string,
  locale: Locale,
  limit = 8,
): Country[] {
  const q = normalize(query);
  if (!q) return [];
  return matchSorter(getIndex(locale), q, {
    keys: ["_normalized"],
    threshold: rankings.CONTAINS,
  }).slice(0, limit);
}

export function getCountryByCode(code: string): Country | undefined {
  return TYPED.find((c) => c.code === code);
}
