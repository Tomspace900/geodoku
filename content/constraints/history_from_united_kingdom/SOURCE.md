---
constraint_id: history_from_united_kingdom
status: active
checked_at: 2026-09-09
review_after: 2027-03-09
---

# history_from_united_kingdom

## Définition

Pays dont le Factbook rattache l'indépendance ou l'autonomie souveraine de l'État
actuel au **Royaume-Uni** — y compris indépendances graduelles, mandats et
protectorats.

## Sources

- Référence de révision : [histoire et souveraineté](../SOURCES.md#histoire-et-souveraineté).
- [CIA World Factbook — champ *Independence*](https://www.cia.gov/the-world-factbook/field/independence/).
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
