---
constraint_id: history_sovereignty_since_1990
status: active
checked_at: 2026-09-09
review_after: 2027-03-09
---

# history_sovereignty_since_1990

## Définition

Pays dont l'**événement de souveraineté** de l'État actuel — indépendance,
restauration de l'indépendance ou succession d'État après dissolution — date de
**1990 ou après**. Couvre notamment les dissolutions de l'URSS et de la
Yougoslavie.

## Sources

- Référence de révision : [histoire et souveraineté](../SOURCES.md#histoire-et-souveraineté).
- [CIA World Factbook — champ *Independence*](https://www.cia.gov/the-world-factbook/field/independence/).
- Dataset curé : `scripts/countries/data/sovereignty.ts` — un `SovereigntyEvent`
  par ISO3, porté verbatim du snapshot `sovereignty` de `constraint-explorer`
  (221b42d).

## Dérivation

`content/constraints/derivations.ts` :
`sovereigntyYear !== null && sovereigntyYear >= 1990 && sovereigntyKind ∈
{ independence, restoration, dissolution_successor }`. `build-countries` reprend
`year` et `kind` **tels quels** de l'événement retenu (aucune valeur masquée).
L'éligibilité n'est **pas stockée** : elle se re-dérive du `kind` — l'ensemble
retenu reproduit exactement le flag v1 `qualifiesForIndependenceConstraints`, qui
n'était qu'une fonction du `kind` (`independence` / `restoration` /
`dissolution_successor` → oui ; `foundation` / `unification` / `continuation` →
non).

## Cas limites

- **Russie** (1991, `kind: continuation`) et **Yémen** (1990, `kind: unification`)
  sont **hors liste** — écartés par le `kind`, pas par une donnée effacée : leur
  `sovereigntyYear` reste 1991 / 1990 dans le snapshot.
- **Namibie** : 1990, pile sur la borne — incluse.
- **États baltes** : l'année et la date sont celles de la **déclaration** de
  rétablissement de l'indépendance que donne la source — Lituanie 11 mars 1990,
  Lettonie 4 mai 1990, Estonie 20 août 1991 (reconnaissance soviétique le
  6 septembre 1991 pour les trois). La Lettonie portait jusqu'au lot 4 l'année
  1991 avec la date de 1918 ; corrigée le 2026-09-25, sans effet sur la liste.
- Timor-Leste : 2002, `restoration` — inclus.
- Territoires et dépendances non jouables : hors liste.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
