---
constraint_id: water_island
status: active
checked_at: 2026-10-14
review_after: 2027-01-21
---

# water_island

## Définition

Pays dont **tout le territoire est insulaire** : île ou archipel entouré d'eau, sans frontière terrestre jouable — ou dont l'île est **partagée** avec un autre pays (Irlande, Haïti, Timor oriental…).

## Sources

- Référence de révision (comparaison, jamais importée) : [géographie quantitative](../SOURCES.md#géographie-administrative-et-quantitative) (enclavement et frontières officielles).
- Liste établie depuis `landlocked` et le décompte de frontières de world-countries, complétée par une classification curée pour les États sur une île partagée (`sharedIslandState`, `scripts/countries/countryPatches.ts`).

## Dérivation

`content/constraints/derivations.ts` : `waterAccess` == `island` **ou** `geoTags` contient `shared_island` (tag curé). `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Deux arbitrages Geodoku, pas des données sources : l'**Australie** est jouée comme **insulaire** (continent-État entouré d'eau, sans frontière terrestre — révision P2, 2026-08-28 ; auparavant classée continentale), le **Sri Lanka** comme **insulaire** malgré la frontière listée en amont. Les deux sont posés dans `scripts/countries/countryPatches.ts` (`sourceCorrectionsByIso3`).

**Île partagée (revue 2026-10-14, #129).** `deriveWaterAccess` ne donne `island` qu'à un pays sans aucune frontière terrestre : Brunei, Haïti, l'Indonésie, l'Irlande, la Papouasie-Nouvelle-Guinée, la République dominicaine, le Royaume-Uni et le Timor oriental y sont `coastal`, alors que tout leur territoire est insulaire. `waterAccess` n'est **pas** touché — d'autres lectures en dépendent — : une classification curée distincte porte ces huit pays, et `water_island` lit les deux. Liste passée de 40 à 48 : BRN, DOM, GBR, HTI, IDN, IRL, PNG, TLS.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
