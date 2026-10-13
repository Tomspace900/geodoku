---
constraint_id: language_arabic
status: active
checked_at: 2026-09-11
review_after: 2027-03-11
---

# language_arabic

## Définition

Pays dont **l'arabe** est une langue officielle nationale.

## Sources

- Référence de révision : constitutions et portails officiels des États concernés.
- Liste établie depuis le champ `languages` (ISO 639) de world-countries.
- Conventions communes : [sources](../SOURCES.md).

## Dérivation

`content/constraints/derivations.ts` : `officialLanguages` contient `ar`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Seul le statut officiel **national** compte : de droit, ou de fait là où aucune loi n'en désigne (l'anglais aux États-Unis, au Royaume-Uni, en Australie). Une langue régionale, co-officielle localement, de travail ou d'usage courant sans statut n'ouvre pas la liste (règle tranchée le 2026-10-09, corrections dans `scripts/countries/countryPatches.ts`).

## Révision

Revue 2026-09-11 — **ISR** retiré : la loi fondamentale de 2018 a remplacé le statut officiel de l'arabe par un « statut spécial ».

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
