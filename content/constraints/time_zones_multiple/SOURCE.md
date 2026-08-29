---
constraint_id: time_zones_multiple
status: active
checked_at: 2026-08-29
review_after: 2027-02-28
---

# time_zones_multiple

## Définition

Pays observant **au moins deux** décalages UTC civils distincts *en même temps*.

## Sources

- Référence de révision : [IANA Time Zone Database](https://www.iana.org/time-zones).
- Dataset curé : `scripts/countries/data/civilTimeOffsets.ts` (décalages civils
  distincts par pays à une date de référence, portés du snapshot
  `civil-time-offsets` de `constraint-explorer`).

## Dérivation

`content/constraints/derivations.ts` : `utcOffsetCount >= 2`. `build-countries`
réduit le dataset à ce scalaire (`quantitativeFactsForCode`) ; `pnpm build:answers`
matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par
`pnpm check:content`).

## Cas limites

La contrainte porte sur les décalages **civils simultanés** — pas sur le nombre
de zones IANA, pas sur les changements saisonniers successifs. Un territoire
ultramarin décalé compte pour son État souverain jouable (Espagne + Canaries,
Portugal + Açores). Les dépendances non jouables ne sont pas ajoutées à part.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
