---
constraint_id: flag_has_animal
status: active
checked_at: 2026-09-11
review_after: 2027-03-11
---

# flag_has_animal

## Définition

Pays dont le drapeau porte un **animal**.

## Sources

- Référence de révision : [drapeaux](../SOURCES.md#drapeaux).
- Liste établie par classification visuelle éditoriale, drapeau par drapeau.

## Dérivation

`content/constraints/derivations.ts` : `flagSymbols` contient `animal`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Tout motif figurant sur le drapeau d'État compte, armoiries comprises et quelle que soit sa taille ([convention `flag_*`](../SOURCES.md#drapeaux)) — c'est ce que dit le toast joueur. Un motif stylisé reste la principale source de désaccord sur cette contrainte et se tranche drapeau par drapeau.

## Révision

Revue 2026-09-11 — même règle. Ajouts : **AND** (deux vaches du quartier de Béarn), **BOL** (condor et alpaga), **VEN** (cheval blanc), **PRY** (lion du revers, armes du Trésor).

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
