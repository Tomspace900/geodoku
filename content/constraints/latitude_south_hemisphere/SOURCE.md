---
constraint_id: latitude_south_hemisphere
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# latitude_south_hemisphere

## Définition

Pays dont le centre approximatif se situe dans l'hémisphère sud.

## Sources

- Référence de révision (comparaison, jamais importée) : [géographie quantitative](../SOURCES.md#géographie-administrative-et-quantitative) (coordonnées centrales officielles).
- Liste établie depuis les coordonnées `latlng` de world-countries, avec une correction
  curée : **RD Congo `COD: -2.88`** (`countryPatches.ts`).

## Dérivation

`content/constraints/derivations.ts` : `latitude` < 0. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

**RD Congo.** Son `latlng` de world-countries vaut 0 : le pays est exactement sur l'équateur, et `latitude < 0` le classait au nord par accident d'arrondi. Il s'étend de 5,4°N à 13,5°S, sa capitale est à -4,32° et son centroïde à -2,88° : sud à l'unanimité des trois lectures, d'où la correction (même motif que dans `countryPatches.ts`). Les dix autres pays à cheval sur l'équateur tombent déjà du bon côté sans correction.

Le critère porte sur le **centre** du pays, pas sur son extension : un pays à cheval sur l'équateur n'entre pas dans la liste si son centre est au nord.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
