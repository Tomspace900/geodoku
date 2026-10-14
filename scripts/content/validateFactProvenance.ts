/**
 * Garde de la provenance des faits pays (`content/countries/factProvenance.ts`,
 * lot 2) — câblée à `check-content.ts`.
 *
 * Les types `{ readonly [K in SheetRowId]: FactProvenance }`,
 * `{ readonly [K in ProductionRankKey]: FactProvenance }` et
 * `{ readonly [K in CountryEvent]: FactProvenance }` garantissent déjà, à la
 * compilation, la couverture exhaustive des lignes de fiche, des produits et
 * des événements : une entrée ajoutée sans provenance ne compile pas. Cette
 * garde ne couvre donc que ce que le type ne peut pas exprimer — ici, rien de
 * plus que la collecte des sources citées, réutilisée par `check-content.ts`
 * pour l'union avec `referencedSourcesFromAbouts` (lot 1) avant d'appeler
 * `unreferencedSourceErrors` sur `content/sources.ts` dans son ensemble.
 */
import {
  EVENT_PROVENANCE,
  FACT_PROVENANCE,
  PRODUCTION_PROVENANCE,
} from "../../content/countries/factProvenance";
import type { SourceId } from "../../content/sources";

export function referencedSourcesFromFactProvenance(): ReadonlySet<SourceId> {
  const referenced = new Set<SourceId>();
  [
    ...Object.values(FACT_PROVENANCE),
    ...Object.values(PRODUCTION_PROVENANCE),
    ...Object.values(EVENT_PROVENANCE),
  ].forEach((provenance) => {
    provenance.sources.forEach((sourceId) => {
      referenced.add(sourceId);
    });
  });
  return referenced;
}
