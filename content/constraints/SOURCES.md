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

## Périmètre territorial d'un pays

Un pays jouable **inclut son territoire pleinement intégré, et rien d'autre**.
Cette règle vaut pour toutes les familles géographiques — volcans, océans,
fuseaux horaires, relief — et prime sur le découpage de la source, qui varie
d'un fournisseur à l'autre.

**Intégré, donc compté** : régions et départements d'outre-mer, régions
autonomes, collectivités qui font partie de l'État au même titre que sa
métropole. Guadeloupe, Martinique, Guyane, Mayotte et La Réunion (France) ;
Canaries (Espagne) ; Açores et Madère (Portugal) ; îles BES — Bonaire, Saba,
Saint-Eustache (Pays-Bas) ; Jan Mayen (Norvège) ; île Marion (Afrique du Sud) ;
Galápagos (Équateur) ; Andaman-et-Nicobar (Inde) ; Kermadec (Nouvelle-Zélande) ;
Alaska et Hawaï (États-Unis).

**Non intégré, donc exclu** : territoires d'outre-mer britanniques ; Polynésie
française, Nouvelle-Calédonie et TAAF ; île Bouvet (dépendance norvégienne) ;
Groenland et Féroé (pays constitutifs autonomes du Danemark) ; Aruba, Curaçao et
Saint-Martin (pays constitutifs des Pays-Bas) ; Mariannes du Nord et Samoa
américaines (territoires non incorporés) ; Heard-et-MacDonald (territoire
extérieur australien). Sont également hors périmètre les zones sans souveraineté
reconnue (Antarctique, haute mer) et les territoires contestés, qu'on ne
tranche pas.

**Pourquoi la règle est écrite ici et pas dans chaque contrainte.** Avant la
revue métier de 2026-09-10, trois familles y répondaient différemment, chacune
en héritant du découpage de son dataset : le Smithsonian GVP indexe par État
souverain, donc le Royaume-Uni « possédait un volcan » par Tristan da Cunha et
les Pays-Bas par Saba ; la base IANA indexe par code ISO 3166, donc la France
n'avait qu'un fuseau alors qu'elle en couvre douze, tandis que l'Espagne et le
Portugal en avaient deux par accident de nomenclature ; la curation des océans
donnait à la France une façade indienne mais pas de façade caraïbe. Le joueur
n'avait aucun moyen de deviner laquelle des trois conventions s'appliquait.

**Une exception assumée : la superficie.** `areaKm2` retient la **France
métropolitaine** (551 695 km²) alors que les DOM comptent pour ses océans, ses
cinq fuseaux et ses frontières brésilienne et surinamaise. C'est délibéré : « la
France » à laquelle un joueur compare une superficie est l'hexagone, pas les
643 801 km² DOM compris. Le choix décide `area_larger_france` pour l'Ukraine,
Madagascar, le Botswana et le Kenya, tous les quatre entre les deux valeurs.

`areaKm2` est par ailleurs la **superficie totale** (terres et eaux
intérieures), uniformément pour les 197 pays. Les Pays-Bas à 41 850 km² ne sont
pas une anomalie de méthode : ils ont simplement 18 % d'eau, ce qui abaisse leur
densité calculée par rapport au chiffre usuel, lequel se fonde sur la seule
superficie terrestre.

Toute contrainte géographique nouvelle applique cette règle et le dit dans son
`SOURCE.md`.

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
d'heuristique.

**Convention `flag_*` (tranchée le 2026-09-11).** Deux règles, communes aux quatre
contraintes de drapeau :

1. **Le drapeau d'État fait foi**, pas le drapeau civil. Costa Rica, Bolivie,
   Venezuela et Paraguay ne portent leurs armoiries que sur la version d'État :
   elles comptent.
2. **Tout élément figurant sur le drapeau compte, armoiries comprises**, quelle que
   soit sa taille. Un croissant dans un écu vaut `crescent` au même titre qu'un
   croissant en pleine étoffe.

Ces deux règles n'en sont qu'une seule vue de deux côtés : *ce qu'on voit sur le
drapeau officiel*. La liste les appliquait déjà de fait — la Dominique tire ses
quatre symboles de son blason, la Croatie sa martre de la couronne — mais de
façon incohérente : le même blason croate fournissait l'animal et pas le croissant
ni l'étoile. La revue 2026-09-11 a rattrapé HRV, MDA, GNQ, AND, SRB, CRI, BOL,
VEN et PRY.

Restent **hors** convention faute d'élément identifiable à l'œil sur le drapeau
rendu : la croix au sommet de la couronne espagnole, l'orbe crucifère de l'aigle
monténégrin, la disposition en croix des quinas portugaises, la défense de sanglier
vanuatuane. À rouvrir si un joueur les réclame.

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

## Production et énergie

- Production agricole (cacao, café, riz, blé) : [FAOSTAT](https://www.fao.org/faostat/),
  production territoriale, moyenne triennale 2022-2024. Items « Cocoa beans »,
  « Coffee, green », « Rice, paddy », « Wheat ».
- Production d'énergie (pétrole brut, gaz naturel sec) :
  [U.S. EIA International](https://www.eia.gov/international/data/world).
  Datasets curés : `top 18` par produit, la longue traîne de producteurs
  marginaux étant écartée à la curation (hors de portée du top 15).
- Part du charbon dans l'électricité :
  [Ember Data Explorer](https://ember-energy.org/data/data-tools/data-explorer/),
  production d'électricité (pas énergie primaire ni consommation finale).

Tous ces classements portent sur la **production**, jamais les exportations ni
les réserves. Un pays absent d'une source vaut `null`, jamais 0.

## Océans

La convention Geodoku part de l'[IHO S-23](https://iho.int/uploads/user/pubs/standards/s-23/S-23_Ed3_1953_EN.pdf).

**Une mer fermée n'est pas un océan (tranché le 2026-09-11).** Méditerranée, mer
des Caraïbes, mer Rouge, golfe Persique, Baltique et mer Noire ne valent pas
façade océanique : seule une côte sur l'océan lui-même compte, pour `ocean_*`
comme pour `ocean_multiple_basins`. Un pays qui a les deux — la côte est
atlantique ouverte des Petites Antilles, la côte pacifique d'un pays d'Amérique
centrale — porte le tag correspondant et compte par lui.

La règle a un coût assumé : le Panama n'est plus « bordé par deux océans ». On le
paie plutôt que d'entretenir une liste d'exceptions, et le libellé joueur devient
littéralement exact. La façade
arctique (`arctic_coast`) est une convention curée, restreinte aux quatre États à
côte arctique continue (Canada, Norvège, Russie, États-Unis) ; elle ne sert
qu'à `ocean_multiple_basins`. Les dépendances ne sont pas automatiquement
repliées sur leur État souverain — mais les territoires ultramarins d'un État
jouable comptent pour lui.

**Mers fermées (tranché le 2026-09-11).** La **Baltique** et la **mer Noire** ne
sont rattachées à aucun bassin : ce sont des mers intérieures, pas des océans.
Conséquence assumée — SWE, FIN, POL, EST, LVA, LTU (Baltique) et BGR, ROU, UKR,
GEO (mer Noire) sont `coastal` sans satisfaire aucune contrainte `ocean_*`. Le
contraste avec DEU et DNK, qui ont l'Atlantique par la mer du Nord, est voulu :
la mer du Nord est un bras ouvert de l'Atlantique, la Baltique non.

La **Finlande n'a pas de façade arctique** : elle a perdu Petsamo en 1944 et
n'atteint plus l'océan Glacial. Aucun État jouable ne borde l'océan Austral —
l'Antarctique n'est pas jouable et l'île Marion (46°S) relève de l'Indien.

## Histoire et souveraineté

- [CIA World Factbook — champ *Independence*](https://www.cia.gov/the-world-factbook/field/independence/),
  via le miroir figé `factbook.json` (commit `8662a8b`).
- Dataset curé : `scripts/countries/data/sovereignty.ts` — un « événement de
  souveraineté retenu » par pays (nature, année, ancienne puissance), porté du
  snapshot `sovereignty` de `constraint-explorer` (221b42d).

L'**événement retenu** est celui qui marque l'accès à la souveraineté de l'État
actuel : indépendance, restauration de l'indépendance, séparation, succession
après dissolution, continuité d'État, fondation ou unification. `build-countries`
en garde trois scalaires par pays — `formerSovereigns` (slugs des anciennes
puissances, jamais des ISO3), `sovereigntyYear`, `sovereigntyKind` — **tels
quels**, sans masquage.

- `history_from_france` / `history_from_united_kingdom` lisent **uniquement**
  l'appartenance à `formerSovereigns` : ni le `kind`, ni aucune éligibilité. Le
  Yémen est ainsi dans la liste britannique (Sud-Yémen britannique) bien que son
  événement de 1990 soit une `unification`.
- `history_sovereignty_since_1990` lit `sovereigntyYear >= 1990` **et**
  `sovereigntyKind ∈ { independence, restoration, dissolution_successor }` : les
  continuités d'État (Russie 1991) et unifications (Yémen 1990) sont écartées par
  le `kind`, pas par une donnée effacée.

Un pays non couvert par la source vaut `[]` / `null`, jamais 0. Les territoires et
dépendances non jouables n'entrent dans aucune liste.
