/**
 * Promesse mémoïsée du chunk de fiche pays (`countrySheetData.ts`). Appelée
 * au montage de la grille solution pour précharger le chunk avant tout tap
 * sur une case, et par `useCountrySheetData` pour lire les faits une fois le
 * chunk arrivé — le même import, jamais relancé deux fois.
 */
let pending: Promise<typeof import("./countrySheetData")> | null = null;

export function loadCountrySheetData(): Promise<
  typeof import("./countrySheetData")
> {
  if (!pending) {
    pending = import("./countrySheetData");
  }
  return pending;
}
