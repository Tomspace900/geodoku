---
constraint_id: language_french
status: active
checked_at: 2026-09-11
review_after: 2027-03-11
---

# language_french

## Définition

Pays dont **le français** est une langue officielle nationale.

## Sources

- Référence de révision : constitutions et portails officiels des États concernés.
- Liste établie depuis le champ `languages` (ISO 639) de world-countries.
- Conventions communes : [sources](../SOURCES.md).

## Dérivation

`content/constraints/derivations.ts` : `officialLanguages` contient `fr`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Seul le statut officiel **national** compte : une langue régionale, co-officielle localement ou simplement majoritaire n'ouvre pas la liste.

## Révision

Revue 2026-09-11 — trois retraits datés, tous des changements constitutionnels que REST Countries n'a pas intégrés : **MLI** (constitution 2023), **BFA** (révision décembre 2023) et **NER** (mars 2025) ont fait passer le français de langue officielle à langue de travail. **LBN** retiré aussi : l'arabe est la seule langue officielle du Liban, le français n'a qu'un statut d'usage.

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
