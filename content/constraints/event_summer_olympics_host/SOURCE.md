---
constraint_id: event_summer_olympics_host
status: active
checked_at: 2026-10-13
review_after: 2027-04-13
---

# event_summer_olympics_host

## Définition

Pays ayant accueilli des Jeux olympiques d'été.

## Sources

- Référence de révision : [événements sportifs](../SOURCES.md#événements-sportifs).
- Liste établie par compilation éditoriale, édition par édition.

## Dérivation

`content/constraints/derivations.ts` : `events` contient `summer_olympics_host`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le pays retenu est celui qui contient aujourd'hui la ville hôte (Moscou 1980, Union soviétique à l'époque, compte pour la Russie). Les éditions futures attribuées ne comptent pas.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
