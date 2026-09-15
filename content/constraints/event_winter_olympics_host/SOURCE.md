---
constraint_id: event_winter_olympics_host
status: active
checked_at: 2026-08-28
review_after: 2027-02-28
---

# event_winter_olympics_host

## Définition

Pays ayant accueilli au moins une édition des **Jeux olympiques d'hiver**.

## Sources

- Référence de révision : [événements sportifs](../SOURCES.md#événements-sportifs).
- CIO, *Olympic Hosts 1896–2034* (bibliothèque olympique).
- Liste établie par compilation éditoriale, édition par édition, du bucket `eventWinterOlympicsHost` de `scripts/countries/countryPatches.ts`.

## Dérivation

`content/constraints/derivations.ts` : `events` contient `winter_olympics_host`, alimenté par le bucket `eventWinterOlympicsHost` de `countryPatches.ts` lors de `pnpm build:countries`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Un pays est retenu selon l'attribution officielle de l'édition, quel que soit le nombre de villes ou de sites. Une édition est rattachée au pays qui contient aujourd'hui le territoire hôte : Sarajevo 1984 (Yougoslavie à l'époque) compte pour la **Bosnie-Herzégovine**. Une édition future déjà attribuée ne compte pas tant qu'elle n'a pas eu lieu (à la révision, les éditions 2030 French Alps et 2034 Salt Lake City relèvent de pays déjà hôtes).

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
