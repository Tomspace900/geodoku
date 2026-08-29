---
constraint_id: time_zones_min_3
status: active
checked_at: 2026-08-29
review_after: 2027-02-28
---

# time_zones_min_3

## Définition

Pays observant **au moins trois** décalages UTC civils distincts *en même temps*.

## Sources

- Référence de révision : [IANA Time Zone Database](https://www.iana.org/time-zones).
- Dataset curé : `scripts/countries/data/civilTimeOffsets.ts`.

## Dérivation

`content/constraints/derivations.ts` : `utcOffsetCount >= 3`. Même chaîne que
[`time_zones_multiple`](../time_zones_multiple/SOURCE.md) — seul le seuil change.
`pnpm build:answers` matérialise `answers.ts`, gardé par `pnpm check:content`.

## Cas limites

Seuil plus dur : la liste se réduit aux grands pays très étalés en longitude
(Russie, États-Unis, Canada, Brésil, Australie, Mexique, Indonésie, Kiribati…).
Une liste étroite se marie rarement à l'intersection (`MIN_CELL_SIZE`) — c'est
attendu, ne pas élargir. Mêmes conventions territoriales que `time_zones_multiple`.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
