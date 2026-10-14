---
constraint_id: history_from_united_kingdom
status: active
checked_at: 2026-10-14
review_after: 2027-10-14
---

# history_from_united_kingdom

## Définition

Pays passé **un jour** sous domination britannique : colonie, protectorat, État
protégé, mandat ou tutelle, condominium, administration d'une ex-colonie ennemie
jusqu'à son indépendance — y compris quand il est devenu indépendant d'un autre
État (Singapour, de la Malaisie ; le Bangladesh, du Pakistan). Règles communes :
[histoire et souveraineté](../SOURCES.md#histoire-et-souveraineté).

## Sources

- Dataset curé : `scripts/countries/data/historicalDominations.ts` — une période
  par pays (nature, début, fin, partie concernée), un motif et ses sources ; les
  cas écartés y sont gardés avec la règle qui les écarte.
- [CIA World Factbook — champs *Background* et *Independence*](https://www.cia.gov/the-world-factbook/field/background/),
  miroir figé `factbook.json` (commit `8662a8b`). **La publication du Factbook a
  été arrêtée en février 2026** : toute révision future se fera contre d'autres
  sources de référence.
- [Encyclopædia Britannica](https://www.britannica.com/), une page citée par
  entrée (lue le 2026-10-14).

## Dérivation

`content/constraints/derivations.ts` : une entrée `united_kingdom` dans
`dominations`. `build-countries` fusionne le dataset dans `facts.ts` ;
`pnpm build:answers` matérialise `answers.ts` (relu en diff, gardé par
`pnpm check:content`, qui garde aussi la cohérence du dataset —
`validateHistoricalDominations`). Le Drawer affiche la nature et la période
(« Colonie (1819–1963) »), avec la partie concernée quand le pays ne l'a été
qu'en partie (« Colonie, Aden (1839–1967) »).

## Cas limites

- **Liste passée de 61 à 72 (2026-10-14, #126).** Entrent Singapour, le
  Bangladesh, la Papouasie-Nouvelle-Guinée (Papouasie britannique, Port
  Moresby), le Soudan du Sud et la Palestine (mêmes condominium et mandat que le
  Soudan et Israël), le Cameroun (Cameroun méridional, uni en 1961), la Libye et
  l'Érythrée (administrations de 1942–1951 et 1941–1952), le Bhoutan (traité de
  1910, même statut que l'Afghanistan), l'Arabie saoudite (protectorat sur le
  Nejd, 1915–1927) et le Suriname (colonie anglaise, 1651–1667). Aucune sortie.
- **La Libye**, cas ouvert de l'ancienne version (« from UN trusteeship »
  tronqué) : tranchée par la règle d'administration, la Cyrénaïque et la
  Tripolitaine étant sous administration militaire britannique jusqu'en 1951.
  Le Fezzan, sous administration française, n'en fait pas entrer la Libye dans
  `history_from_france` (Tripoli était britannique).
- **Le Yémen et la Somalie** entrent par l'union : Sanaa n'a jamais été
  britannique, Mogadiscio relevait de l'Italie, mais Aden et le Somaliland se
  sont unis à l'État au moment de la décolonisation.
- **Écartés** (bloc `excluded`) : Oman et le Népal (jamais protectorat), la
  Namibie et le Samoa (mandats exercés par un dominion), la Chine (Hong Kong),
  la Grèce (îles Ioniennes), l'Allemagne (Heligoland), l'Espagne (Minorque) et
  d'autres territoires partiels sans la capitale, les occupations militaires
  (Islande, Haïti, Manille, La Havane, Buenos Aires…), la France médiévale.
- Afghanistan 1919 / Égypte 1922 : fin du contrôle des affaires étrangères / du
  protectorat, comptés.
- Vanuatu, Cameroun, Dominique, Grenade, Maurice, Sainte-Lucie, Saint-Kitts,
  Seychelles et Canada figurent aussi dans `history_from_france`.
- Territoires et dépendances non jouables : hors liste.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
