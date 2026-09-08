---
constraint_id: production_natural_gas_top15
status: active
checked_at: 2026-09-08
review_after: 2027-03-08
---

# production_natural_gas_top15

## Définition

Pays figurant dans les **15 premiers producteurs mondiaux** de gaz naturel.

## Sources

- Référence de révision : [production et énergie](../SOURCES.md#production-et-énergie).
- [U.S. EIA International Data](https://www.eia.gov/international/data/world), gaz
  naturel sec en milliards de m³, référence 2024.
- Dataset curé : `scripts/countries/data/energyProduction.ts` — `top 18` par
  produit (le reste écarté à la curation), porté du snapshot `energy-production`
  de `constraint-explorer` (221b42d).

## Dérivation

`content/constraints/derivations.ts` : `productionRanks.natural_gas <= 15`.
`build-countries` fusionne le rang du pays dans `productionRanks`
(`quantitativeFactsForCode`, cap rang ≤ 15) ; `pnpm build:answers` matérialise
`answers.ts` (relu en diff, gardé par `pnpm check:content`).

## Cas limites

Le classement porte sur le **gaz sec** (dry natural gas), prêt à la
commercialisation après traitement — pas le gaz brut ni le GNL réexporté.
Production, pas réserves ni exportations. Rang 15 (Égypte) proche du rang 16
(Argentine) : contrôler la bascule.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
