---
constraint_id: political_asean
status: active
checked_at: 2026-08-28
review_after: 2027-02-28
---

# political_asean

## Définition

États membres de l'**Association des nations de l'Asie du Sud-Est (ASEAN)** retenus par la convention Geodoku.

## Sources

- Référence de révision : [organisations politiques](../SOURCES.md#organisations-politiques) (liste officielle de l'organisation, à une date explicite).
- Liste établie depuis les adhésions exposées par REST Countries v5.

## Dérivation

`content/constraints/derivations.ts` : `memberships` contient `asean`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le Timor oriental est le onzième membre (adhésion actée le 26 octobre 2025). REST Countries v5 ne l'a pas encore intégré : un delta `membershipsAdd: ["asean"]` sur `TLS` dans `countryPatches.ts` le rétablit, à retirer quand la source rattrape. La Papouasie–Nouvelle-Guinée (observateur) est exclue. Les territoires non jouables ne sont pas ajoutés séparément.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
