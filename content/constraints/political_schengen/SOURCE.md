---
constraint_id: political_schengen
status: active
checked_at: 2026-08-28
review_after: 2027-02-28
---

# political_schengen

## Définition

États membres de l'**espace Schengen** retenus par la convention Geodoku.

## Sources

- Référence de révision : [organisations politiques](../SOURCES.md#organisations-politiques) (liste officielle de l'organisation, à une date explicite).
- Liste établie depuis les adhésions exposées par REST Countries v5.

## Dérivation

`content/constraints/derivations.ts` : `memberships` contient `schengen`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

L'espace inclut quatre États non membres de l'UE (Islande, Norvège, Suisse, Liechtenstein). La Bulgarie et la Roumanie sont membres de plein exercice depuis 2025. L'Irlande (opt-out) et Chypre (application partielle) sont exclues. Les micro-États de facto dans l'espace (Monaco, Saint-Marin, Vatican) ne sont pas ajoutés séparément.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
