import type { TKey } from "@/i18n/types";

/**
 * Territoires non jouables (hors `COUNTRY_CATALOG`) cités dans `borders` —
 * `getCountryByIso3` n'en sait rien, la fiche a besoin d'un nom à afficher.
 * Module dédié, séparé de `countrySheetLabels.ts` : celui-ci n'est importé
 * que par le chunk lazy `countrySheetData.ts`, alors que ce nom de
 * territoire est résolu par `CountrySheet.tsx`, resté eager — les fusionner
 * ferait rentrer toutes les tables d'énumération dans le chargement initial.
 */
export const NON_PLAYABLE_BORDER_TERRITORY_LABELS: Readonly<
  Record<string, TKey>
> = {
  ESH: "countrySheet.territory.esh",
  HKG: "countrySheet.territory.hkg",
  MAC: "countrySheet.territory.mac",
};
