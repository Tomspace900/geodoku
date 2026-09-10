---
constraint_id: history_from_united_kingdom
status: active
checked_at: 2026-09-10
review_after: 2027-09-10
---

# history_from_united_kingdom

## Définition

Pays dont le Factbook rattache l'indépendance ou l'autonomie souveraine de l'État
actuel au **Royaume-Uni** — y compris indépendances graduelles, mandats et
protectorats.

## Sources

- Référence de révision : [histoire et souveraineté](../SOURCES.md#histoire-et-souveraineté).
- [CIA World Factbook — champ *Independence*](https://www.cia.gov/the-world-factbook/field/independence/).
  **La publication du Factbook a été arrêtée en février 2026** : le miroir figé
  (`factbook.json`, commit `8662a8b`) devient la seule source disponible, et il ne
  sera plus mis à jour. Toute révision future se fera donc contre des sources
  nationales ou onusiennes, pas contre le Factbook.
- **Cas ouvert — la Libye.** Le miroir porte « 24 December 1951 (from UN
  trusteeship) » là où le Factbook publiait « … under British and French
  administration ». L'entrée paraît tronquée. Si c'est confirmé, la Libye devrait
  entrer dans cette liste **et** dans `history_from_france`. Non tranché faute de
  pouvoir consulter la source d'origine.
- Dataset curé : `scripts/countries/data/sovereignty.ts` — un `SovereigntyEvent`
  par ISO3, porté verbatim du snapshot `sovereignty` de `constraint-explorer`
  (221b42d).

## Dérivation

`content/constraints/derivations.ts` :
`formerSovereigns.includes("united_kingdom")`. `build-countries` fusionne
`formerSovereigns` (des **slugs**, pas des ISO3) depuis l'événement retenu ;
`pnpm build:answers` matérialise `answers.ts` (relu en diff, gardé par
`pnpm check:content`). **Aucun filtre de `kind` ni d'éligibilité.**

## Cas limites

- **Deux trous restants, comblés à la revue métier du 2026-09-10.** La passe du
  2026-09-09 avait corrigé les trois cas repérés à l'œil et conclu « rattrapé » ;
  une passe **systématique** sur les 193 `sourceDescription` — chercher toute
  mention d'une des neuf puissances tracées absente de `formerSovereigns` — en a
  trouvé deux de plus : le **Soudan** (« from Egypt and the UK », condominium
  anglo-égyptien de 1899 à 1956) et **Nauru** (« UK-administered UN trusteeship »,
  alors que la même formulation produisait déjà `united_states` pour PLW, MHL et
  FSM). La liste passe de 59 à **61**. Cette passe est désormais outillée :
  `validateSovereigntySources`, câblée à `pnpm check:content`.
- **Ce que la contrainte ne couvre pas.** Le Factbook rattache l'indépendance au
  souverain **immédiatement antérieur**, pas à la puissance coloniale : Singapour
  y figure « from Malaysian Federation », le Bangladesh « from Pakistan », la
  Papouasie-Nouvelle-Guinée « from the Australian-administered UN trusteeship ».
  Ces trois-là sont donc hors liste alors qu'un joueur les dirait britanniques.
  C'est une limite de la source, assumée ; le libellé a été élargi en conséquence
  (« Anciennement sous domination britannique »).
- **Trou de parsing v1 rattrapé (revue 2026-09-09).** L'extracteur qui a produit
  le snapshot ne reconnaissait pas les formulations « declared independence from
  Great Britain », « from British India » ni « union of British North American
  colonies… recognized by UK ». Trois `formerSovereigns` complétés à la main dans
  `scripts/countries/data/sovereignty.ts` : **USA**, **PAK**, **CAN**. La liste
  passe de 56 (v1) à **59** — écart volontaire, pas une régression.
  - Cohérence rétablie : l'Inde (colonie britannique jusqu'en 1947) et le Pakistan
    (même partition) sont désormais traités pareil ; l'Australie et la
    Nouvelle-Zélande (« federation of UK colonies ») ont toujours été dans la
    liste, le Canada (formulation quasi identique) les rejoint.
- **Israël et Yémen y sont** : `formerSovereigns` contient `united_kingdom` (mandat
  britannique en Palestine ; Sud-Yémen britannique) alors que leur événement porte
  `qualifiesForIndependenceConstraints: false` — et, pour le Yémen, un `kind`
  `unification` (1990). La contrainte ne lit ni ce flag ni le `kind`.
- Égypte 1922 / Afghanistan 1919 : fin du protectorat / du contrôle britannique
  des affaires étrangères, comptés.
- Vanuatu (`VUT`) figure aussi dans `history_from_france` (condominium).
- Territoires et dépendances non jouables : hors liste.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
