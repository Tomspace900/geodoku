# Sources communes des contraintes

Chaque `SOURCE.md` reste propriétaire de la définition jouable, de la dérivation
et des cas limites de **sa** contrainte. Ce document porte ce qui vaut pour
toutes : le principe, la procédure de révision et les références partagées.

## Principe

La vérité d'une contrainte **active** est `derivations.ts` **appliqué au snapshot
de faits** (`content/countries/facts.ts`) : un prédicat pur, une donnée datée.
Son `answers.ts` est une **matérialisation générée** par `pnpm build:answers`,
committée et **relue en diff** — jamais éditée à la main. `pnpm check:content`
rejoue les dérivations et échoue si un `answers.ts` est obsolète.

Les 11 contraintes **archivées** n'ont pas de dérivation : leur `answers.ts` est
une **liste figée à la main** (sans en-tête `@generated`), conservée pour le
replay des grilles déjà publiées.

Une source externe **informe** la décision, elle ne la remplace jamais : aucun
changement de liste sans décision éditoriale visible dans le diff — soit par une
entrée de curation (`scripts/countries/countryPatches.ts`,
`scripts/countries/flagData.json`), soit par la donnée du snapshot, soit par la
dérivation elle-même.

Les territoires et dépendances non jouables n'entrent dans aucune liste, même
quand la source les distingue.

## Procédure de révision

Pour une contrainte **active** — on ne touche **jamais** `answers.ts` à la main :

1. Relire la définition, la dérivation et les cas limites du `SOURCE.md`
   concerné.
2. Décider du levier :
   - la **définition** change (seuil, champ, pivot) → éditer
     `content/constraints/derivations.ts` (et `CONSTRAINTS` si le libellé ou la
     catégorie bougent) ;
   - une **donnée** est fausse ou périmée → corriger l'entrée de curation
     (`countryPatches.ts`, `flagData.json`) ou attendre la prochaine
     `pnpm build:countries`, qui rafraîchit le snapshot.
3. `pnpm build:answers` (hors-ligne) régénère les `answers.ts` actifs.
4. Comparer la nouvelle liste à la précédente **pays par pays** (diff ISO3), en
   portant l'attention sur les cas proches d'un seuil-repère et sur ce qui a
   bougé depuis la dernière révision.
5. Consigner tout arbitrage nouveau dans la section « Cas limites » ; mettre à
   jour `checked_at` (et `review_after` si utile).
6. `pnpm check:content`, `pnpm test`, `pnpm simulate:scheduling`, puis
   régénération du pool depuis `/admin` une fois la revue produit faite — les
   grilles déjà publiées restent protégées par `gridAnswers`.

Pour une contrainte **archivée** : la liste est figée, elle ne bouge jamais. Une
contrainte publiée n'est **pas supprimée**, elle est archivée
(`ARCHIVED_CONSTRAINT_IDS` + `ARCHIVED_CONSTRAINTS`), pour que les grilles déjà
jouées restent lisibles.

## Géographie administrative et quantitative

- Continents et sous-régions : [ONU M49](https://unstats.un.org/unsd/methodology/m49/).
- Frontières et enclavement : [World Bank Official Boundaries](https://datacatalog.worldbank.org/search/dataset/0038272/world-bank-official-boundaries).
- Population, superficie et densité : [World Development Indicators](https://datacatalog.worldbank.org/search/dataset/0037712/world-development-indicators)
  et [UN World Population Prospects 2024](https://www.un.org/development/desa/pd/world-population-prospects-2024).

Une comparaison quantitative emploie un même millésime et un même périmètre.
Une valeur absente n'est jamais assimilée à zéro ou à `false`.

## Drapeaux

La classification visuelle est vérifiée à partir des drapeaux officiels réunis
par [UN Member States](https://www.un.org/en/about-us/member-states) et des
descriptions nationales. Les symboles, couleurs et dispositions retenus par le
jeu vivent dans la table curée `scripts/countries/flagData.json` — pas
d'heuristique. Les symboles stylisés ou intégrés à des armoiries font l'objet
d'une convention éditoriale explicite.

## Organisations politiques

- Union européenne : [liste officielle des pays](https://european-union.europa.eu/principles-countries-history/country-profiles_en).
- G20 : [membres officiels](https://g20.org/about-g20/).
- OTAN : [pays membres](https://www.nato.int/cps/en/natohq/topics_52044.htm).
- Commonwealth : [pays membres](https://thecommonwealth.org/our-member-countries).
- Ligue arabe : [États membres](https://www.leagueofarabstates.net/).
- ASEAN : [États membres](https://asean.org/member-states/).
- BRICS : [présentation officielle](https://brics2025.org.br/en/about-the-brics/).
- Zone euro : [pays de la zone euro](https://www.consilium.europa.eu/fr/policies/the-euro/).
- G7 : [présentation du groupe](https://www.consilium.europa.eu/fr/international-summit/g7-summit/).
- OPEP : [pays membres](https://www.opec.org/opec_web/en/about_us/25.htm).
- Espace Schengen : [pays de l'espace Schengen](https://www.consilium.europa.eu/fr/policies/schengen-area/).

Seuls les États membres retenus par la convention Geodoku sont jouables ; les
observateurs, invités, partenaires et organisations supranationales sont exclus.
Une adhésion ou un retrait récent (Timor-Leste à l'ASEAN, retrait émirati de
l'OPEP, statut saoudien aux BRICS) suit le millésime du snapshot REST Countries
et se tranche à la révision, jamais par édition manuelle de `answers.ts`.

## Événements sportifs

- Coupe du monde de football : [éditions et hôtes FIFA](https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup).
- Jeux olympiques d'été et d'hiver : [éditions et villes hôtes CIO](https://www.olympics.com/ioc/olympic-games)
  et [CIO, *Olympic Hosts 1896–2034*](https://library.olympics.com/).

Le pays retenu est l'entité politique qui contient aujourd'hui le territoire
hôte de l'édition (Sarajevo 1984 → Bosnie-Herzégovine). Une co-organisation
compte pour chaque pays hôte ; une édition future déjà attribuée ne compte pas
tant qu'elle n'a pas eu lieu.

## Nature et relief

- Équateur et côtes : [Natural Earth 5.1.2](https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2/geojson).
- Déserts et forêts tropicales : [NASA MODIS MCD12Q1](https://doi.org/10.5067/MODIS/MCD12Q1.061),
  complété par une revue éditoriale des biomes nommés.
- Volcans actifs à l'Holocène : [Smithsonian Global Volcanism Program](https://volcano.si.edu/).
- Part de territoire montagneux : indicateur [ODD 15.4.2](https://unstats.un.org/sdgs/metadata/?Text=&Goal=15&Target=15.4)
  (méthode FAO/UNEP-WCMC).
- Part de superficie forestière : FAO Forest Resources Assessment (World Bank
  `AG.LND.FRST.ZS`).

Une part quantitative absente de la source vaut `null`, jamais 0 : le pays est
alors hors liste sans être compté comme « 0 % ».

## Temps et centres urbains

- Décalages horaires civils : [IANA Time Zone Database](https://www.iana.org/time-zones)
  — décalages **civils simultanés** à une date de référence, pas les zones IANA
  ni les changements saisonniers.
- Centres urbains de plus d'un million d'habitants :
  [GHSL Urban Centre Database](https://human-settlement.emergency.copernicus.eu/ghs_ucdb_2024.php)
  — agglomération bâtie, pas la commune administrative.

## Océans

La convention Geodoku part de l'[IHO S-23](https://iho.int/uploads/user/pubs/standards/s-23/S-23_Ed3_1953_EN.pdf).
La Méditerranée et la mer des Caraïbes sont rattachées à l'Atlantique. La façade
arctique (`arctic_coast`) est une convention curée, restreinte aux quatre États à
côte arctique continue (Canada, Norvège, Russie, États-Unis) ; elle ne sert
qu'à `ocean_multiple_basins`. Les dépendances ne sont pas automatiquement
repliées sur leur État souverain — mais les territoires ultramarins d'un État
jouable comptent pour lui.
