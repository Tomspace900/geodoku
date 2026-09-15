---
constraint_id: event_summer_olympics_host
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
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

Le pays retenu est celui de la ville hôte au moment de l'édition, entité politique de l'époque comprise. Les éditions futures attribuées ne comptent pas.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
