import countriesJson from "@/features/countries/data/countries.json";
import type { Country } from "@/features/countries/types";
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

// Pre-computed index to avoid recomputing on every keystroke
type IndexedCountry = Country & { _normalized: string[] };
const INDEX: IndexedCountry[] = TYPED.map((c) => ({
  ...c,
  _normalized: [normalize(c.nameCanonical), c.code.toLowerCase()],
}));

export function searchCountries(query: string, limit = 8): Country[] {
  const q = normalize(query);
  if (!q) return [];
  return matchSorter(INDEX, q, {
    keys: ["_normalized"],
    threshold: rankings.CONTAINS,
  }).slice(0, limit);
}

export function getCountryByCode(code: string): Country | undefined {
  return TYPED.find((c) => c.code === code);
}
