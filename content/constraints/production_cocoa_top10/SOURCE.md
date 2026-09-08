---
constraint_id: production_cocoa_top10
status: active
checked_at: 2026-09-08
review_after: 2027-03-08
---

# production_cocoa_top10

## Définition

Pays figurant dans les **10 premiers producteurs mondiaux** de fèves de cacao.

## Sources

- Référence de révision : [production et énergie](../SOURCES.md#production-et-énergie).
- [FAOSTAT](https://www.fao.org/faostat/), item « Cocoa beans », production
  territoriale en tonnes.
- Dataset curé : `scripts/countries/data/agriculturalProduction.ts` — classement
  `top 10`, moyenne des campagnes 2022-2024, porté du snapshot
  `agricultural-production` de `constraint-explorer` (221b42d).

## Dérivation

`content/constraints/derivations.ts` : `productionRanks.cocoa <= 10`.
`build-countries` fusionne le rang du pays dans `productionRanks`
(`quantitativeFactsForCode`, cap rang ≤ 15) ; `pnpm build:answers` matérialise
`answers.ts` (relu en diff, gardé par `pnpm check:content`).

## Cas limites

Le classement porte sur la **production**, jamais les exportations ni les
réserves. La Côte d'Ivoire domine très largement ; la queue du top 10 (Rép.
dominicaine, Colombie) est plus volatile d'une révision à l'autre — contrôler les
rangs 9-11 à chaque mise à jour de source.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
