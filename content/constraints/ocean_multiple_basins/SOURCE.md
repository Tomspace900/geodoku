---
constraint_id: ocean_multiple_basins
status: active
checked_at: 2026-08-29
review_after: 2027-02-28
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
- Les territoires ultramarins comptent pour l'État souverain jouable : la
  **France** est multi-bassins par la Guyane (Atlantique), la Réunion/Mayotte
  (Indien) et la Polynésie/Nouvelle-Calédonie (Pacifique).
- Les dépendances ne sont pas repliées automatiquement sur leur État souverain.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
