---
constraint_id: political_brics
status: active
checked_at: 2026-08-28
review_after: 2027-02-28
---

# political_brics

## Définition

États membres des **BRICS** retenus par la convention Geodoku.

## Sources

- Référence de révision : [organisations politiques](../SOURCES.md#organisations-politiques) (liste officielle de l'organisation, à une date explicite).
- Liste établie depuis les adhésions exposées par REST Countries v5.

## Dérivation

`content/constraints/derivations.ts` : `memberships` contient `brics`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le noyau historique (Brésil, Russie, Inde, Chine, Afrique du Sud) est complété par les adhésions de 2024-2025 (Égypte, Éthiopie, Iran, Émirats arabes unis, Indonésie). L'Arabie saoudite, invitée mais dont l'adhésion n'a pas été formellement confirmée, est tranchée explicitement à la révision selon ce que porte le snapshot REST Countries. Les pays « partenaires » (statut distinct de membre) sont exclus.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
