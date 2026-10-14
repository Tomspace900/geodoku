---
constraint_id: continent_asia
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# continent_asia

## Définition

Pays dont le continent Geodoku est **Asie**.

## Sources

- Référence de révision : [nomenclature ONU M49](../SOURCES.md#géographie-administrative-et-quantitative).
- Liste établie depuis les champs `region` / `subregion` de world-countries, alignés sur M49.

## Dérivation

`content/constraints/derivations.ts` : `continent` == `asia`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Un pays transcontinental (Russie, Turquie, Égypte…) est rattaché à un seul continent, celui que retient la convention Geodoku.

## Révision

Revue 2026-10-09 (#122) — **Chypre** est absente de cette liste : elle est comptée en
Europe par convention Geodoku (cf. `continent_europe`), alors que M49 la place en Asie
occidentale.

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
