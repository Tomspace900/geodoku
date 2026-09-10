---
constraint_id: production_coffee_top10
status: active
checked_at: 2026-09-10
review_after: 2027-09-10
---

# production_coffee_top10

## Définition

Pays figurant dans les **10 premiers producteurs mondiaux** de café.

## Sources

- Référence de révision : [production et énergie](../SOURCES.md#production-et-énergie).
- [U.S. Department of Agriculture, Foreign Agricultural Service — *Coffee: World
  Markets and Trade*](https://apps.fas.usda.gov/psdonline/circulars/coffee.pdf),
  circulaire de juillet 2026, table *Total Production*.
- Dataset curé : `scripts/countries/data/agriculturalProduction.ts` — classement
  `top 10`, moyenne des campagnes **2023/24 à 2025/26**, en milliers de sacs de
  60 kg. Le bloc porte sa propre source : les autres produits agricoles restent
  sur FAOSTAT.

## Dérivation

`content/constraints/derivations.ts` : `productionRanks.coffee <= 10`.
`build-countries` fusionne le rang du pays dans `productionRanks`
(`quantitativeFactsForCode`, cap rang ≤ 15) ; `pnpm build:answers` matérialise
`answers.ts` (relu en diff, gardé par `pnpm check:content`).

## Cas limites

- **Re-sourçage à la revue métier du 2026-09-10.** La série FAOSTAT « Coffee,
  green » plaçait la **République centrafricaine au 10ᵉ rang mondial** avec
  316 kt. La dérivation était fidèle à sa source, mais la valeur est une
  **imputation** de la FAO : la production centrafricaine réelle se compte en
  milliers de tonnes, et l'USDA-FAS, qui suit la filière pays par pays, ne classe
  pas le pays. Le défaut était double — un faux positif que personne ne devine et
  l'éviction du **Mexique**, producteur que tout joueur cite. C'est le seul cas de
  ce lot où une donnée fidèle à sa source était néanmoins fausse en jeu.
- Conséquence assumée : la source change d'unité (sacs de 60 kg au lieu de
  tonnes) et de calendrier (campagnes commerciales au lieu d'années civiles). Seul
  le **rang** est lu par la dérivation, donc l'hétérogénéité entre produits ne se
  propage pas au jeu.
- **Marge au seuil** : le 10ᵉ est le Mexique (3 955 milliers de sacs), le 11ᵉ le
  **Guatemala** (3 298), le 12ᵉ le Nicaragua (2 522). L'écart 10ᵉ-11ᵉ est de
  ~17 %, ce n'est pas un seuil sur le fil. Le Guatemala reste hors liste : c'est
  le classement, pas un arbitrage.
- Le café est une production, jamais des exportations ni des réserves.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision). Reprendre
la table *Total Production* de la circulaire USDA-FAS, recalculer la moyenne
triennale, contrôler les rangs 9-11.
