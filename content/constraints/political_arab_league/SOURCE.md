---
constraint_id: political_arab_league
status: archived
checked_at: 2026-09-10
review_after: 2027-09-10
---

# political_arab_league

## En réserve

Retirée du jeu actif à la revue métier du **2026-09-10**. Motif mesuré : **les 22
membres de la Ligue arabe sont tous dans `language_arabic`** (25 réponses) —
coefficient d'inclusion 1,00, Jaccard 0,88. Le générateur interdit donc déjà la
co-occurrence des deux contraintes dans une grille (`MAX_CONSTRAINT_OVERLAP`
0,85), et la contrainte n'ouvrait aucun croisement que « Langue officielle arabe »
n'ouvre déjà. À quoi s'ajoute le critère de fun : c'est une liste d'États à
mémoriser, exactement le motif qui a écarté le G7 et Schengen au lot 2, alors que
la contrainte de langue, elle, est devinable.

La contrainte n'est **ni générée ni rejouable** et n'a plus d'`answers.ts`
(`RESERVE_CONSTRAINT_IDS` dans `content/constraints/index.ts`). Réactivation :
réintroduire l'entrée dans `CONSTRAINTS` (`src/features/game/logic/constraints.ts`),
la dérivation dans `content/constraints/derivations.ts` et les clés i18n fr + en,
puis `pnpm build:answers`.

## Définition

États membres de la **Ligue des États arabes** retenus par la convention Geodoku.

## Sources

- Référence de révision : [organisations politiques](../SOURCES.md#organisations-politiques) (liste officielle de l'organisation, à une date explicite).
- Liste établie depuis les adhésions exposées par REST Countries v5.

## Dérivation

`content/constraints/derivations.ts` : `memberships` contient `arab_league`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Les membres observateurs (Brésil, Inde, Venezuela, Érythrée…) ne sont pas retenus. Une adhésion suspendue est tranchée explicitement au moment de la révision. Les territoires non jouables ne sont pas ajoutés séparément.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
