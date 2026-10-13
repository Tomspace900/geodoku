---
constraint_id: continent_north_america
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# continent_north_america

## Définition

Pays dont le continent Geodoku est **Amérique du Nord**.

## Sources

- Référence de révision : [nomenclature ONU M49](../SOURCES.md#géographie-administrative-et-quantitative).
- Liste établie depuis les champs `region` / `subregion` de world-countries, arbitrés par Geodoku (M49 en référence).

## Dérivation

`content/constraints/derivations.ts` : `continent` == `north_america`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

L'Amérique centrale et les Caraïbes sont rattachées à l'Amérique du Nord par **convention Geodoku** : M49 les range sous « Amérique latine et Caraïbes », hors de l'Amérique septentrionale. La clarification joueur le dit (« Comprend l'Amérique centrale et les Caraïbes »).

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
