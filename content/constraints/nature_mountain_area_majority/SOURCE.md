---
constraint_id: nature_mountain_area_majority
status: active
checked_at: 2026-09-10
review_after: 2027-09-10
---

# nature_mountain_area_majority

## Définition

Pays dont **plus de la moitié** de la superficie terrestre est classée montagneuse.

## Sources

- Référence de révision : [nature et relief](../SOURCES.md#nature-et-relief).
- Indicateur ODD 15.4.2 (part de territoire montagneux), méthode FAO/UNEP-WCMC —
  [UN SDG API, série `ER_MTN_TOTL`](https://unstats.un.org/SDGAPI/v1/sdg/Series/Data?seriesCode=ER_MTN_TOTL).
- Dataset curé : `scripts/countries/data/mountainArea.ts` (part + année de
  référence par pays, millésime 2021, porté du snapshot `mountain-area`).

## Dérivation

`content/constraints/derivations.ts` : `mountainAreaShare !== null && > 0.5`.
`build-countries` convertit le pourcentage source en fraction 0–1 ; un pays hors
couverture vaut `null` (jamais 0). `pnpm build:answers` matérialise `answers.ts`
(gardé par `pnpm check:content`).

## Cas limites

La classification « montagneux » suit la définition UNEP-WCMC (altitude, pente,
amplitude locale), pas une perception commune : de petits États à relief marqué
(Andorre, Liechtenstein, Rwanda, Eswatini) passent le seuil, de grands pays très
montagneux « en moyenne » mais à vastes plaines (Chine à 0,5x) sont limites.
Documenter tout arbitrage de seuil ici.

**Huit pays absents de la série onusienne, quatre comblés (revue métier
2026-09-10).** L'API `unstats.un.org` ne publie **aucune** valeur `ER_MTN_TOTL`
pour ARG, CAN, DEU, ISR, NOR et TUR — 30 lignes chacun, toutes vides, tous
millésimes confondus — et TWN comme XKX sont hors du système onusien. Ce n'est
pas un défaut de moisson : la série ne les couvre pas.

Quatre d'entre eux franchissent le seuil et étaient donc des faux négatifs
visibles — la Norvège et la Turquie sont précisément les pays qu'un joueur cite
en premier. Ils reçoivent une valeur **curée**, marquée par `source` dans
`scripts/countries/data/mountainArea.ts` : Norvège 91,3 % (Nordregio, *Mountain
Areas in Europe*, étude DG Regio 2004), Turquie 80 % (Britannica), Taïwan 66 %
(administration du tourisme R.O.C.), Kosovo 64 %.

Les quatre autres restent absents : ils sont sous le seuil de l'avis de toutes
les sources consultées (Canada ~25 %), et `null` y est indiscernable de « sous le
seuil » côté joueur — les combler n'apporterait rien.

**Règle de curation, à respecter pour toute valeur future.** Une valeur
hors-série n'est écrite que si l'écart au seuil dépasse largement l'écart entre
délimitations. C'est nécessaire : la Norvège vaut ~30 % sous la définition
norvégienne (au-dessus de la limite des arbres, Arnesen et al. 2010) contre
91,3 % sous la délimitation européenne — un facteur 3 qui **inverse** la réponse.
Les quatre valeurs retenues sont à 14 points ou plus du seuil, ce qui rend le
choix de délimitation indifférent. Le Kosovo est la plus fragile des quatre.

Corollaire : les valeurs curées ne sont **pas** comparables au chiffre près avec
la série ONU (celle-ci donne la Suisse à 85,8 %, Nordregio à 76,2 %). Elles ne
servent qu'à trancher le booléen.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
