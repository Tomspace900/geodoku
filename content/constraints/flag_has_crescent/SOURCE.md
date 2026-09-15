---
constraint_id: flag_has_crescent
status: active
checked_at: 2026-09-11
review_after: 2027-03-11
---

# flag_has_crescent

## Définition

Pays dont le drapeau porte un **croissant**.

## Sources

- Référence de révision : [drapeaux](../SOURCES.md#drapeaux).
- Liste établie par classification visuelle éditoriale, drapeau par drapeau.

## Dérivation

`content/constraints/derivations.ts` : `flagSymbols` contient `crescent`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Un motif stylisé, minuscule ou intégré à des armoiries relève d'une décision explicite — c'est la principale source de désaccord sur cette contrainte.

## Révision

Revue 2026-09-11 — **le drapeau d'État fait foi et les armoiries comptent** (règle commune, cf. [SOURCES.md](../SOURCES.md#drapeaux)). Ajouts : **HRV** (étoile à six branches sur croissant d'argent, premier écu de la couronne) et **MDA** (croissant à gauche de la tête d'aurochs). Les deux portaient déjà `animal` issu du **même** blason : la liste était incohérente avec elle-même.

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
