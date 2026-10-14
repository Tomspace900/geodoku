/**
 * Garde des millésimes — câblée à `check-content.ts`.
 *
 * Le millésime d'une source récoltée ou datée (`content/sources.ts`, écrit à la
 * main, affiché au joueur) doit dire exactement ce que dit son dataset. Chaque
 * libellé attendu se calcule depuis la donnée — date de récolte Wikidata, plage
 * d'années WDI, année de la forêt, édition de l'IDH, date de l'instantané des
 * adhésions, dernière édition tenue — et le script qui met la donnée à jour
 * l'imprime ; la comparaison, exacte, est la même pour toutes.
 */
import type { SourceId, SourceReference } from "../../content/sources";
import type { LocalizedString } from "../../content/type";

export function validateSourceVintages(
  sources: Readonly<Record<SourceId, SourceReference>>,
  expectedVintages: Readonly<Partial<Record<SourceId, LocalizedString>>>,
): string[] {
  return Object.entries(expectedVintages).flatMap(([id, expected]) => {
    const actual = sources[id as SourceId].vintage;
    if (actual?.fr === expected.fr && actual?.en === expected.en) return [];
    return [
      `sources.${id}: millésime ${JSON.stringify(actual)} désaccordé de son dataset (attendu ${JSON.stringify(expected)}) — mettre à jour content/sources.ts`,
    ];
  });
}
