---
constraint_id: production_crude_oil_top15
status: active
checked_at: 2026-09-08
review_after: 2027-03-08
---

# production_crude_oil_top15

## Définition

Pays figurant dans les **15 premiers producteurs mondiaux** de pétrole brut.

## Sources

- Référence de révision : [production et énergie](../SOURCES.md#production-et-énergie).
- [U.S. EIA International Data](https://www.eia.gov/international/data/world),
  pétrole brut en milliers de barils par jour, référence 2025.
- Dataset curé : `scripts/countries/data/energyProduction.ts` — `top 18` par
  produit (le reste, producteurs marginaux, écarté à la curation), porté du
  snapshot `energy-production` de `constraint-explorer` (221b42d).

## Dérivation

`content/constraints/derivations.ts` : `productionRanks.crude_oil <= 15`.
`build-countries` fusionne le rang du pays dans `productionRanks`
(`quantitativeFactsForCode`, cap rang ≤ 15) ; `pnpm build:answers` matérialise
`answers.ts` (relu en diff, gardé par `pnpm check:content`).

## Cas limites

Le classement porte sur la **production** (crude oil + lease condensates), jamais
les réserves prouvées ni les exportations — d'où l'absence du Venezuela (réserves
énormes, production effondrée) et la présence des États-Unis en tête. Rang 15
(Libye) proche du rang 16 (Qatar) : contrôler la bascule à chaque millésime EIA.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
