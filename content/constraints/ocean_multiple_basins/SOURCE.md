---
constraint_id: ocean_multiple_basins
status: active
checked_at: 2026-09-11
review_after: 2027-03-11
---

# ocean_multiple_basins

## Définition

Pays bordé par **au moins deux** bassins océaniques distincts parmi Atlantique,
Pacifique, Indien et Arctique — formulé aux joueurs comme « bordé par au moins
deux océans ».

## Sources

- Référence de révision : [océans](../SOURCES.md#océans) (convention Geodoku,
  point de départ [IHO S-23](https://iho.int/uploads/user/pubs/standards/s-23/S-23_Ed3_1953_EN.pdf)).
- Façades curées : buckets `atlanticCoast` / `pacificCoast` / `indianOceanCoast`
  / `arcticCoast` de `scripts/countries/countryPatches.ts`.

## Dérivation

`content/constraints/derivations.ts` : `oceanBasinCount(f) >= 2`. Le décompte
replie **Méditerranée** et **mer des Caraïbes** sur l'Atlantique (convention
Geodoku) et lit la façade **arctique** curée (`arctic_coast`, quatre États
riverains : Canada, Norvège, Russie, États-Unis). `pnpm build:answers`
matérialise `answers.ts` (gardé par `pnpm check:content`).

## Cas limites

- Notre snapshot sépare `mediterranean_coast` / `caribbean_coast` de
  `atlantic_coast` : sans le repli, l'Égypte (Méditerranée + mer Rouge) ou la
  Colombie (Caraïbes + Pacifique) manqueraient à tort la contrainte.
- `arctic_coast` est une façade nouvelle, curée et restreinte aux quatre États à
  côte arctique continue : elle donne son second bassin à la **Norvège**
  (Atlantique + Arctique) et à la **Russie** (Pacifique + Arctique).
- **Périmètre territorial** : règle commune, cf.
  [SOURCES.md](../SOURCES.md#périmètre-territorial-dun-pays). Corrigé à la revue
  métier du 2026-09-10 : ce document affirmait que la **France** était
  multi-bassins « par la Guyane (Atlantique), la Réunion/Mayotte (Indien) et la
  Polynésie/Nouvelle-Calédonie (Pacifique) », alors que la donnée ne lui donnait
  ni façade pacifique ni façade caraïbe. La France répondait donc « oui » à
  « Bordé par l'océan Indien » et « non » à « Bordé par l'océan Pacifique ».
- État corrigé : la France porte Méditerranée, Atlantique (métropole et Guyane),
  **Caraïbes** (Guadeloupe, Martinique) et Indien (La Réunion, Mayotte). Elle
  reste **hors du Pacifique** : la Polynésie et la Nouvelle-Calédonie sont des
  collectivités non intégrées. Le décompte de bassins est inchangé — la France y
  était déjà — mais les trois contraintes `ocean_*` sont désormais cohérentes
  entre elles.
- Les dépendances ne sont pas repliées automatiquement sur leur État souverain.

## Révision

Revue 2026-09-11 — `oceanBasinCount` ne replie plus les mers fermées sur leur
bassin. Méditerranée, mer des Caraïbes, mer Rouge, golfe Persique, Baltique et mer
Noire ne comptent plus : seule une façade sur l'océan lui-même compte. 18 → 11 pays.

Sortent **PAN, CRI, COL, GTM, HND, NIC** (leur second bassin n'était que la mer des
Caraïbes), **EGY** (Méditerranée + mer Rouge) et **ISR** (Méditerranée + mer Rouge).

**Le Panama est le prix assumé de la règle.** Le pays du canal entre deux océans
n'est plus « bordé par deux océans » : sa côte nord donne sur une mer fermée. C'est
contre-intuitif, et c'est le coût d'une règle qui tient en une phrase plutôt que
d'une liste d'exceptions. Le libellé joueur — « Bordé par au moins deux océans » —
devient en revanche littéralement exact, ce qu'il n'était pas avant.

Onze pays restent, au-dessus du plancher du jeu (les plus petites contraintes
actives en comptent six) ; `simulate:scheduling` passe 14/14.

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
