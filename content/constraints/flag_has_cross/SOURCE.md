---
constraint_id: flag_has_cross
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# flag_has_cross

## Définition

Pays dont le drapeau porte une **croix**.

## Sources

- Référence de révision : [drapeaux](../SOURCES.md#drapeaux).
- Liste établie par classification visuelle éditoriale, drapeau par drapeau.

## Dérivation

`content/constraints/derivations.ts` : `flagSymbols` contient `cross`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Un motif stylisé, minuscule ou intégré à des armoiries relève d'une décision explicite — c'est la principale source de désaccord sur cette contrainte.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
