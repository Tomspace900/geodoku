---
constraint_id: time_zones_multiple
status: active
checked_at: 2026-09-11
review_after: 2027-03-11
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
de zones IANA, pas sur les changements saisonniers successifs.

**Périmètre territorial** : règle commune, cf.
[SOURCES.md](../SOURCES.md#périmètre-territorial-dun-pays). Corrigé à la revue
métier du 2026-09-10 : la règle était énoncée ici (« un territoire ultramarin
décalé compte pour son État souverain ») mais n'était pas celle appliquée. Le
dataset suivait le code ISO 3166 de la zone IANA — les Canaries et les Açores
sont sous `ES` et `PT`, mais la Guadeloupe est sous `GP` et La Réunion sous `RE`.
L'Espagne et le Portugal passaient donc par accident de nomenclature, tandis que
la **France restait à un seul décalage** alors qu'elle en couvre douze au total,
plus que tout autre pays au monde.

Depuis la correction : la France compte **5 décalages** (Antilles −04:00, Guyane
−03:00, métropole +01:00, Mayotte +03:00, La Réunion +04:00) et les **Pays-Bas 2**
(métropole +01:00, îles BES −04:00). La Polynésie française et la
Nouvelle-Calédonie sont exclues, comme Aruba et Curaçao : collectivités et pays
constitutifs non intégrés.

Le **Royaume-Uni** et le **Danemark** restent à 1 : aucun territoire intégré
décalé — les territoires britanniques d'outre-mer, le Groenland et les Féroé sont
hors périmètre. C'est la règle, pas un oubli.

**Cas ouvert — l'Ukraine.** Elle compte 2 décalages uniquement parce qu'IANA
maintient `Europe/Simferopol` à UTC+03:00 depuis l'annexion russe de la Crimée en
2014 ; le temps civil légal ukrainien est unique. La donnée est conservée telle
quelle faute d'arbitrage, mais le jeu affirme ici une conséquence de
l'occupation.

**Cas ouvert — la Chine.** IANA expose `Asia/Urumqi` (UTC+06:00), mais l'heure de
Pékin est la seule heure civile officielle de la République populaire. Au sens
strict de la définition ci-dessus, la Chine ne devrait pas qualifier.

## Révision

Revue 2026-09-11 — deux comptes IANA ne correspondaient pas à un fuseau **civil officiel** : **CHN** (UTC+8 partout, l'heure du Xinjiang est un usage local) et **UKR** (le second décalage vient d'Europe/Simferopol, l'heure de Moscou imposée en Crimée occupée). Les deux passent à un fuseau.

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
