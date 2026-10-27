# Comptes, stats et ligues — plan du chantier

Point d'entrée : l'epic [#153](https://github.com/Tomspace900/geodoku/issues/153),
milestone « Comptes, stats et ligues ». Ce plan vit ici le temps du chantier
(AGENTS.md §12). À la mise en prod du dernier lot, ses décisions durables passent
dans `AGENTS.md`, ses points ouverts dans des issues, et le fichier est retiré.

## Objectif

Un compte facultatif, l'historique et les stats, puis des ligues entre amis. Des
joueurs l'ont demandé par mail, et le sondage joueurs d'octobre 2026 l'a confirmé :
se situer parmi les joueurs du jour, suivre ses progrès, retrouver ses parties sur
plusieurs appareils, jouer en ligues entre amis.

**Suivi.** Une sous-issue se ferme dès que son travail arrive sur `develop`.
L'epic reste ouverte jusqu'à la mise en prod du dernier lot.

## Ordre de livraison

| Lot | Issue | Contenu |
| --- | ----- | ------- |
| 0 | [#154](https://github.com/Tomspace900/geodoku/issues/154) | Journal local des parties, invisible pour le joueur |
| 1 | [#70](https://github.com/Tomspace900/geodoku/issues/70) | Convex en Europe, une ligne par partie, « Mes stats » et « Toi et les autres aujourd'hui » |
| 2 | [#155](https://github.com/Tomspace900/geodoku/issues/155) | Compte facultatif : code par e-mail et Google, synchro entre appareils, pseudo |
| 3 | [#156](https://github.com/Tomspace900/geodoku/issues/156) | Ligues entre amis |

- **Le journal d'abord** : l'historique ne commence qu'au jour où on l'enregistre.
  Avant le lot 0, rien ne gardait les parties passées.
- **Les comptes avant les ligues** : sans synchronisation, un joueur sur deux
  appareils verrait son total de la semaine coupé en deux. Les ligues arrivent
  quand les joueurs sont déjà connectés partout.

## Décisions produit

- **Le jeu reste jouable sans compte.** Le compte est facultatif ; les ligues l'exigent.
- **Pas de classement mondial** : les réponses sont envoyées au navigateur, tricher
  serait facile, et il n'y a pas assez de joueurs.
- **Pas de mécanique de série.**
- **Pas d'écran de ligues grisé** : un simple teaser sur l'écran du compte, sans
  bouton « me prévenir ».
- **Connexion** : code par e-mail et Google au lancement, Apple plus tard.
- **PostHog reste anonyme** : pas d'`identify()`, pas de PII.
- **Données d'un compte** : l'e-mail, les parties, un pseudo généré et modifiable,
  un pays facultatif (« Ton pays », affiché en drapeau, jamais « pays d'origine »).
  Rien n'est repris du profil Google (ni nom, ni photo). Aucun score stocké.
- **Droits du joueur** : suppression du compte en libre-service, export sur demande,
  effacement après 3 ans sans partie.
- **Données hébergées en Europe** (lot 1), ce que `/privacy` dira.

## Décisions de structure de données

- **Une ligne par partie, pour les anonymes comme pour les comptes** :
  `date`, `owner` (hash d'un jeton propre à la partie pour un anonyme, `userId`
  pour un compte), `cells[9]`, `failed[9]`, `rating?`, `origin`. Ni vies, ni
  statut, ni cause de fin, ni score : ils se recalculent.
- **Le jeton anonyme ne vaut que pour une partie** : côté serveur, rien ne relie
  les parties d'un même joueur d'un jour à l'autre.
- **`cellStats`** : nombre de joueurs par pays, un document par case et par jour.
  Il remplace `guesses` et `dailyStats`. Seule donnée dérivée stockée, assumée.
- **Une seule mutation par coup**, avec un `moveIndex`. Le numéro attendu se lit
  dans la partie : un coup renvoyé deux fois n'est compté qu'une fois, sans reçu.
  Disparaissent `operationReceipts`, `recordTodayGameEnd`, `recordTodayFailedGuess`
  et `gridFeedback`.
- **Le score d'un jour passé est toujours recalculé**, jamais stocké.
- **« Toi et les autres » est lu à la demande**, pas en direct.
- **Une query publique ne lit jamais l'identité**, pour garder le cache partagé
  entre joueurs (règle à poser dans `AGENTS.md` au lot 1).
- **La refonte et la migration vers l'Europe basculent ensemble** : nouveau schéma
  et nouveau frontend en même temps, sans code de compatibilité, la nuit.

## Lot 0 — Journal local des parties (#154)

Livré sur `develop`. Rien de visible : aucun écran, aucun event PostHog.

- **Clé** `geodoku:history-v1` (localStorage), `{ version: 1, entries: [...] }`,
  entrées triées par date. Module pur [`history.ts`](../src/features/game/logic/history.ts).
- **Une entrée par jour joué de la grille quotidienne**, au format de la future
  ligne serveur : `date`, `cells[9]` (ISO3 ou `null`, cases vides et bloquées
  confondues), `failed[9]`, `rating?`. Les tableaux suivent l'ordre row-major de
  `CELL_KEYS` (`"0,0"`, `"0,1"`… `"2,2"`), celui de toute la topologie du jeu.
- **Créée au premier coup** (réussi ou raté) **et réécrite à chaque coup** et à la
  note. Une partie abandonnée reste donc dans le journal. L'entraînement n'y entre pas.
- **Lecture tolérante** : `sanitizeHistory` écarte une à une les entrées invalides
  (date, ISO3, pays en double, tableaux de 9, erreurs entières positives) ; une
  note illisible ne coûte que la note. Pas de plafond (~50 Ko par an).
- **Erreurs par case** : `GameState.failed`, tenu par le reducer (`guessFailure`
  reçoit la case), avec `somme(failed) == failedAttemptCount(lives)`. Les vies
  restent lues dans `LivesState`. `game-v3` persiste le détail ; une sauvegarde
  d'avant #154 (ou un détail qui contredit les vies) se recharge en étalant le
  total une à une sur les cases non remplies, dans l'ordre des cases
  ([`failedByCell.ts`](../src/features/game/logic/failedByCell.ts)) : le total
  est exact, seule sa répartition est reconstruite, et sans case « record »
  artificielle. Cela ne touche que la partie en cours le jour du déploiement.
- **Note de difficulté** : `GameState.rating` garde la valeur, persistée dans
  `game-v3`. Une note donnée avant #154 recharge `rated: true` sans valeur.
- **Lot 1** : le journal gardera aussi le jeton de la partie anonyme, pour le
  rattachement au login (lot 2), et mettra en cache les répartitions finales.

## Lot 1 — Convex en Europe, une ligne par partie, deux écrans de stats (#70)

### Migration et refonte, en une seule bascule

- Nouveau déploiement Convex en Europe (`eu-west-1`), export puis import des
  données, bascule entre 23 h et 5 h UTC. Nouveau schéma et nouveau frontend
  partent ensemble.
- **Une ligne par partie**, créée au premier coup d'un anonyme. Elle renvoie un
  jeton propre à la partie, aléatoire, gardé dans le navigateur et haché côté serveur.
- **`playMove({jeton ou compte, moveIndex, cellKey, countryCode})`** valide le pays,
  vérifie qu'il n'est pas déjà utilisé, décompte les vies, met à jour la ligne et
  `cellStats`. Un coup déjà appliqué renvoie l'état courant, un coup trop en
  avance est refusé. La saisie reste instantanée côté client.
- **`cellStats`** : une erreur n'y touche plus et ne renvoie donc plus la
  répartition à tous les joueurs.
- **Supprimés** : tables `guesses`, `dailyStats`, `gridFeedback`,
  `operationReceipts` (et son cron) ; mutations `recordTodayGameEnd`,
  `recordTodayFailedGuess` ; champs `isReplay` et legacy du pool.
- **Réponses allégées** : `getTodayGrid` sans `_id`, `_creationTime` ni
  `candidateId` ; la répartition envoie des comptes entiers.
- **Rate limit** : le `clientId` ne sert plus qu'à créer une partie anonyme
  (1 par minute, 3 par jour par navigateur), ensuite la limite se fait par jeton
  ou par compte. Purger la table du rate limiter, qui n'efface jamais ses lignes.
- **Stats admin d'avant la bascule** : export dans un fichier hors du repo ; les
  comptes par pays sont importés dans `cellStats`, sans fabriquer de parties ; les
  panneaux de `/admin` sont rebranchés sur les lignes de partie.
- **Surveillance** : un cron horaire envoie `server_health_hourly` à PostHog
  (parties créées, refus du rate limiter, plus forte hausse d'un pays dans une
  case), sans identifiant. Alertes réglées dans PostHog.
- **Docs** : `/privacy` (hébergement en Europe) ; `AGENTS.md` (règle « une query
  publique ne lit jamais l'identité », tables et endpoints §6, events §10).

### « Toi et les autres aujourd'hui »

Lu à la demande. Le serveur recalcule les scores et renvoie le nombre de joueurs,
un histogramme de 101 seaux de 10 points (taille fixe) et le taux d'échec par case.
Le client se place lui-même dans l'histogramme (« mieux que X % des joueurs »).

### « Mes stats »

Calculé côté client depuis le journal local et les répartitions finales, mises en
cache une fois le jour fini. Le score d'un jour passé est toujours recalculé.

### À trancher avant de coder

- Où vivent les deux écrans : écran de résultat, page dédiée, navigation ?
- Contenu exact de « Mes stats » : records, évolution, parties jouées, pays rares…
- Affichage quand peu de joueurs ont encore fini la partie du jour.
- Convex renvoie-t-il le résultat d'une query recalculée quand il n'a pas changé ?

Plus tard, si le trafic grossit nettement : un instantané de la cohorte, recalculé
toutes les 5 minutes.

## Lot 2 — Compte facultatif (#155)

### Connexion

- **Better Auth** via `@convex-dev/better-auth` (`ConvexProviderWithAuth` à la
  racine), réglages par défaut.
- **Code par e-mail et Google** au lancement. Apple plus tard (abonnement
  développeur annuel, secret à renouveler tous les 6 mois).
- **Aucune donnée de profil Google reprise** : le `name` de Better Auth reçoit le
  pseudo, la photo n'est pas gardée.
- **Budget bundle** : on accepte de relever celui de `check:bundle`.

### Données du compte

- L'e-mail, les parties (lignes du lot 1) et `profiles { userId, pseudo, country? }`.
  Aucun score stocké.
- **Pseudo** généré par un petit générateur amusant, modifiable.
- **Pays** facultatif, « Ton pays (facultatif) », affiché en drapeau.
- **Suppression** en libre-service, **export** sur demande, **effacement** après
  3 ans sans partie (date de la dernière partie, pas de champ dédié).

### Partie du jour et synchronisation

- Pour un joueur connecté, **le serveur fait foi** : une partie par compte et par
  jour, partagée par tous ses appareils ; le navigateur n'en garde qu'un cache.
- **À la connexion, le serveur l'emporte** :
  - partie anonyme du jour : elle passe au compte par son jeton si le compte n'a
    rien joué ce jour-là, sinon elle reste anonyme ;
  - parties anonymes passées dont le jeton est dans le journal : elles passent au compte ;
  - entrées du journal sans ligne serveur : importées avec `origin: import`, hors ligues ;
  - partie locale en cours alors que le compte a déjà joué : remplacée, sans message.
- **L'entraînement reste local**, sans synchronisation.

### Écran du compte

Pseudo, pays, déconnexion, suppression du compte, et l'annonce des ligues à venir
(pas de bouton « me prévenir », aucune mesure du clic).

### Docs

- `/privacy` à réécrire : e-mail, durée de conservation, droits. Dire que Better
  Auth garde par défaut l'IP et le navigateur dans les sessions, et les jetons
  Google dans ses comptes.
- `AGENTS.md` : « Pas de compte » devient « Pas de compte obligatoire » ; stack
  (§2), backend (§6), events (§10).

## Lot 3 — Ligues entre amis (#156)

### Déjà tranché

- **Compte obligatoire** pour créer ou rejoindre une ligue.
- **Classement de la semaine au total des points.**
- **Parties qui comptent** : une partie anonyme rattachée par son jeton compte ;
  une entrée importée sans ligne serveur (`origin: import`) ne compte pas.
- Pas de classement mondial, pas de mécanique de série.

### À trancher avant de coder

- Invitations : lien ou code ? Taille maximale d'une ligue, nombre de ligues par joueur ?
- Semaine : début le lundi à 0 h UTC ? Que faire des jours non joués ?
- Score du jour : il évolue tant que la cohorte se remplit. Que montre le
  classement du jour avant qu'il soit figé (marqueur « ≈ ») ?
- Égalités, départ d'une ligue, retrait d'un membre.
- Pseudos visibles par les autres : faut-il de la modération ?
