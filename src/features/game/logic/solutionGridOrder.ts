import type { Cell, RarityTier } from "../types";
import { MIN_CELL_TOTAL_GUESSES_FOR_SHARE_PERCENT } from "./constants";
import { raritySharePercent, rarityToTier } from "./rarity";

export type OrderedSolutionCountry = { iso: string; tier: RarityTier | null };

/** Ordre d’affichage sans stats de part : du plus rare au plus commun. */
const TIER_SORT_ORDER: RarityTier[] = ["ultra", "rare", "uncommon", "common"];

function tierSortIndex(tier: RarityTier | null): number {
  if (tier === null) return TIER_SORT_ORDER.length;
  return TIER_SORT_ORDER.indexOf(tier);
}

function filledUserCell(cell: Cell | undefined) {
  return cell?.status === "filled" ? cell : undefined;
}

export function resolveSolutionCountryTier(
  iso: string,
  userCell: Cell | undefined,
  totalGuesses: number,
  rarityByCountry: Record<string, number>,
): RarityTier | null {
  const filled = filledUserCell(userCell);
  if (filled?.countryCode === iso) return filled.rarityTier;
  if (totalGuesses > 0) return rarityToTier(rarityByCountry[iso] ?? 0);
  return null;
}

export function orderSolutionCountries(
  codes: string[],
  totalGuesses: number,
  rarityByCountry: Record<string, number>,
  userCell: Cell | undefined,
  compareByName: (a: string, b: string) => number,
): OrderedSolutionCountry[] {
  return codes
    .map((iso) => ({
      iso,
      tier: resolveSolutionCountryTier(
        iso,
        userCell,
        totalGuesses,
        rarityByCountry,
      ),
    }))
    .sort((a, b) => {
      if (totalGuesses >= MIN_CELL_TOTAL_GUESSES_FOR_SHARE_PERCENT) {
        const pctA = raritySharePercent(rarityByCountry[a.iso] ?? 0);
        const pctB = raritySharePercent(rarityByCountry[b.iso] ?? 0);
        if (pctA !== pctB) return pctA - pctB;
      } else if (totalGuesses > 0) {
        const tierDiff = tierSortIndex(a.tier) - tierSortIndex(b.tier);
        if (tierDiff !== 0) return tierDiff;
      }
      return compareByName(a.iso, b.iso);
    });
}
