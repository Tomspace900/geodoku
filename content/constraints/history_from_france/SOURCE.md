---
constraint_id: history_from_france
status: active
checked_at: 2026-10-14
review_after: 2027-10-14
---

# history_from_france

## Définition

Pays passé **un jour** sous domination française : colonie, protectorat, mandat
ou tutelle, condominium — y compris quand une autre puissance l'a dominé ensuite
(Maurice, les Seychelles, britanniques après 1810). Règles communes :
[histoire et souveraineté](../SOURCES.md#histoire-et-souveraineté).

## Sources

- Dataset curé : `scripts/countries/data/historicalDominations.ts` — une période
  par pays (nature, début, fin, partie concernée), un motif et ses sources ; les
  cas écartés y sont gardés avec la règle qui les écarte.
- [CIA World Factbook — champs *Background* et *Independence*](https://www.cia.gov/the-world-factbook/field/background/),
  miroir figé `factbook.json` (commit `8662a8b`).
- [Encyclopædia Britannica](https://www.britannica.com/), une page citée par
  entrée (lue le 2026-10-14).

## Dérivation

`content/constraints/derivations.ts` : une entrée `france` dans `dominations`.
`build-countries` fusionne le dataset dans `facts.ts` ; `pnpm build:answers`
matérialise `answers.ts` (relu en diff, gardé par `pnpm check:content`, qui garde
aussi la cohérence du dataset — `validateHistoricalDominations`). Le Drawer
affiche la nature et la période (« Colonie (1830–1962) »).

## Cas limites

- **Liste passée de 27 à 35 (2026-10-14, #126).** Entrent Maurice, les
  Seychelles, Sainte-Lucie, la Grenade et la Dominique (françaises avant d'être
  britanniques), la République dominicaine (Santo Domingo sous domination
  française de 1795 à 1809), Saint-Kitts-et-Nevis (partie française de
  Saint-Christophe, Basseterre, jusqu'en 1713) et le Canada (Nouvelle-France,
  dont relevait le site d'Ottawa). Aucune sortie.
- **Mauritanie** : colonie française, mais aucune source de référence ne date le
  début de la domination ; le Drawer n'affiche que la fin (« jusqu'en 1960 »).
- **Écartés** (bloc `excluded`) : les annexions napoléoniennes (Belgique,
  Luxembourg, Pays-Bas, Italie, Vatican, Slovénie, Monaco…), les États
  satellites (Mexique de Maximilien, duché de Varsovie), les territoires
  partiels sans la capitale (Louisiane, Pondichéry, Kouang-Tchéou-Wan, Tobago,
  Fezzan, Hatay), les occupations militaires (Égypte 1798–1801, Malte,
  Chanthaburi…) et Saint-Vincent (établissement toléré, prise de 1779
  restituée). L'Andorre, dont le chef de l'État français est coprince, n'est pas
  « anciennement » sous domination.
- Vanuatu (condominium) et les pays passés d'une puissance à l'autre figurent
  aussi dans `history_from_united_kingdom`.
- Territoires et dépendances non jouables : hors liste.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
