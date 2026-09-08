---
constraint_id: production_coffee_top10
status: active
checked_at: 2026-09-08
review_after: 2027-03-08
---

# production_coffee_top10

## Définition

Pays figurant dans les **10 premiers producteurs mondiaux** de café.

## Sources

- Référence de révision : [production et énergie](../SOURCES.md#production-et-énergie).
- [FAOSTAT](https://www.fao.org/faostat/), item « Coffee, green ».
- Dataset curé : `scripts/countries/data/agriculturalProduction.ts` — classement
  `top 10`, moyenne des campagnes 2022-2024, porté du snapshot
  `agricultural-production` de `constraint-explorer` (221b42d).

## Dérivation

`content/constraints/derivations.ts` : `productionRanks.coffee <= 10`.
`build-countries` fusionne le rang du pays dans `productionRanks`
(`quantitativeFactsForCode`, cap rang ≤ 15) ; `pnpm build:answers` matérialise
`answers.ts` (relu en diff, gardé par `pnpm check:content`).

## Cas limites

L'item FAOSTAT « Coffee, green » est plus large que le seul café marchand
torréfié, mais c'est la série mondiale comparable retenue. Production, pas
exportations ni réserves. La queue du top 10 (Rép. centrafricaine, Honduras) est
serrée — contrôler les rangs 9-11.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
