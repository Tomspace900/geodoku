import type { RarityTier } from "../types";
import { raritySharePercent, rarityToTier } from "./rarity";

export type OrderedSolutionCountry = { iso: string; tier: RarityTier | null };

export function resolveSolutionCountryTier(
  iso: string,
  totalGuesses: number,
  rarityByCountry: Record<string, number>,
): RarityTier | null {
  if (totalGuesses > 0) return rarityToTier(rarityByCountry[iso] ?? 0);
  return null;
}

export function orderSolutionCountries(
  codes: string[],
  totalGuesses: number,
  rarityByCountry: Record<string, number>,
  compareByName: (a: string, b: string) => number,
): OrderedSolutionCountry[] {
  return codes
    .map((iso) => ({
      iso,
      tier: resolveSolutionCountryTier(iso, totalGuesses, rarityByCountry),
    }))
    .sort((a, b) => {
      // Dès la première soumission : du plus rare au plus commun (part croissante).
      if (totalGuesses > 0) {
        const pctA = raritySharePercent(rarityByCountry[a.iso] ?? 0);
        const pctB = raritySharePercent(rarityByCountry[b.iso] ?? 0);
        if (pctA !== pctB) return pctA - pctB;
      }
      return compareByName(a.iso, b.iso);
    });
}
