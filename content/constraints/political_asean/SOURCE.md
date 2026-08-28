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

Le Timor oriental est le onzième membre (adhésion actée en octobre 2025) : sa présence dans la liste dérivée dépend du millésime du snapshot REST Countries et est confirmée à la révision. La Papouasie–Nouvelle-Guinée (observateur) est exclue. Les territoires non jouables ne sont pas ajoutés séparément.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
