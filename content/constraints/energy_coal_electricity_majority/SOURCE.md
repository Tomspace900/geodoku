---
constraint_id: energy_coal_electricity_majority
status: active
checked_at: 2026-09-08
review_after: 2027-03-08
---

# energy_coal_electricity_majority

## Définition

Pays dont **plus de la moitié** de l'électricité est produite à partir de
charbon.

## Sources

- Référence de révision : [production et énergie](../SOURCES.md#production-et-énergie).
- [Ember Data Explorer](https://ember-energy.org/data/data-tools/data-explorer/),
  part du charbon dans la production d'électricité, année 2024.
- Dataset curé : `scripts/countries/data/coalElectricity.ts` — pourcentage par
  ISO3 (valeurs sous 50 % conservées), porté du snapshot `coal-electricity` de
  `constraint-explorer` (221b42d).

## Dérivation

`content/constraints/derivations.ts` :
`coalElectricityShare !== null && > 0.5`. `build-countries` convertit le
pourcentage source en fraction 0–1 ; un pays absent d'Ember vaut `null` (hors
liste), jamais 0. `pnpm build:answers` matérialise `answers.ts` (gardé par
`pnpm check:content`).

## Cas limites

La contrainte porte sur la **production d'électricité**, pas sur l'énergie
primaire ni la consommation finale (transports, chauffage). **Le Vietnam
(50,32 %) passe le seuil strict d'un cheveu** ; l'Australie (45,21 %) et
l'Allemagne (21,44 %) sont dessous. Contrôler le Vietnam et les pays entre 48 et
52 % à chaque millésime Ember.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
