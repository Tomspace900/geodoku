/**
 * Garde des millésimes récoltés — câblée à `check-content.ts`.
 *
 * Le millésime d'une source récoltée (`content/sources.ts`, écrit à la main,
 * affiché au joueur) doit dire exactement ce que dit son dataset, que seule la
 * récolte met à jour. Chaque récolte calcule son libellé attendu — date de
 * récolte Wikidata, plage d'années WDI, année de la forêt, édition de l'IDH —
 * et l'imprime en fin de run ; la comparaison, exacte, est la même pour toutes.
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
      `sources.${id}: millésime ${JSON.stringify(actual)} désaccordé de la récolte (attendu ${JSON.stringify(expected)}) — mettre à jour content/sources.ts`,
    ];
  });
}
