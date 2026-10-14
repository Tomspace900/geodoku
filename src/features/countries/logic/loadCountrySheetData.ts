/**
 * Promesse mémoïsée du chunk des faits (`countrySheetData.ts`). Appelée au
 * montage de la grille solution pour précharger le chunk avant tout tap sur
 * une case ou un en-tête, et par `useConstraintValues` pour lire les faits
 * une fois le chunk arrivé — le même import, jamais relancé deux fois.
 */
let pending: Promise<typeof import("./countrySheetData")> | null = null;

export function loadCountrySheetData(): Promise<
  typeof import("./countrySheetData")
> {
  if (!pending) {
    // Un rejet (réseau coupé, déploiement en cours) ne doit pas mémoriser
    // l'échec pour toujours : sans ce reset, `retry()` relirait indéfiniment
    // la même promesse rejetée et ne pourrait plus jamais réussir.
    pending = import("./countrySheetData").catch((error) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}
