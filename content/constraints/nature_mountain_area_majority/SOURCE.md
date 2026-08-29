---
constraint_id: nature_mountain_area_majority
status: active
checked_at: 2026-08-29
review_after: 2027-02-28
---

# nature_mountain_area_majority

## Définition

Pays dont **plus de la moitié** de la superficie terrestre est classée montagneuse.

## Sources

- Référence de révision : [nature et relief](../SOURCES.md#nature-et-relief).
- Indicateur ODD 15.4.2 (part de territoire montagneux), méthode FAO/UNEP-WCMC —
  [UN SDG API, série `ER_MTN_TOTL`](https://unstats.un.org/SDGAPI/v1/sdg/Series/Data?seriesCode=ER_MTN_TOTL).
- Dataset curé : `scripts/countries/data/mountainArea.ts` (part + année de
  référence par pays, millésime 2021, porté du snapshot `mountain-area`).

## Dérivation

`content/constraints/derivations.ts` : `mountainAreaShare !== null && > 0.5`.
`build-countries` convertit le pourcentage source en fraction 0–1 ; un pays hors
couverture vaut `null` (jamais 0). `pnpm build:answers` matérialise `answers.ts`
(gardé par `pnpm check:content`).

## Cas limites

La classification « montagneux » suit la définition UNEP-WCMC (altitude, pente,
amplitude locale), pas une perception commune : de petits États à relief marqué
(Andorre, Liechtenstein, Rwanda, Eswatini) passent le seuil, de grands pays très
montagneux « en moyenne » mais à vastes plaines (Chine à 0,5x) sont limites.
Documenter tout arbitrage de seuil ici.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
