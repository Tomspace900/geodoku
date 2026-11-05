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
| 1 | [#70](https://github.com/Tomspace900/geodoku/issues/70) | Convex en Europe, une ligne par partie, « Toi et les autres aujourd'hui », calques de la grille solution |
| 2 | [#155](https://github.com/Tomspace900/geodoku/issues/155) | Compte facultatif : code par e-mail et Google, synchro entre appareils, pseudo, « Mes stats » |
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
- **Pas d'écran de ligues grisé** : une simple annonce sur la page « Mes stats »
  d'un joueur connecté, sans bouton « me prévenir ».
- **Connexion** : code par e-mail et Google au lancement, Apple plus tard.
- **PostHog reste anonyme** : pas d'`identify()`, pas de PII.
- **Données d'un compte** : l'e-mail, les parties, un pseudo généré et modifiable,
  un pays facultatif (« Mon pays », affiché en drapeau, jamais « pays d'origine »).
  Rien n'est repris du profil Google (ni nom, ni photo). Aucun score stocké.
- **Droits du joueur** : suppression du compte en libre-service, export sur demande,
  effacement après 3 ans sans partie.
- **Données hébergées en Europe** (lot 1), ce que `/privacy` dira.

## Décisions de structure de données

- **Une ligne par partie, pour les anonymes comme pour les comptes** :
  `date`, `owner` (hash d'un jeton propre à la partie pour un anonyme, `userId`
  pour un compte), `cells[9]`, `failed[9]`, `origin` (la note de difficulté
  `rating?` a été retirée au lot 1, avec le sondage de fin de partie). Ni vies, ni
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

En prod depuis le 28 octobre 2026. Rien de visible : aucun écran, aucun event PostHog.

- **Clé** `geodoku:history-v1` (localStorage), `{ version: 1, entries: [...] }`,
  entrées triées par date. Module pur [`history.ts`](../src/features/game/logic/history.ts).
- **Une entrée par jour joué de la grille quotidienne**, au format de la future
  ligne serveur : `date`, `cells[9]` (ISO3 ou `null`, cases vides et bloquées
  confondues), `failed[9]` et, depuis le lot 1, `token?` (le jeton de la partie,
  pour le rattachement au compte). Les tableaux suivent l'ordre row-major de
  `CELL_KEYS` (`"0,0"`, `"0,1"`… `"2,2"`), celui de toute la topologie du jeu.
- **Créée au premier coup** (réussi ou raté) **et réécrite à chaque coup**. Une partie abandonnée reste donc dans le journal. L'entraînement n'y entre pas.
- **Lecture tolérante** : `sanitizeHistory` écarte une à une les entrées invalides
  (date, ISO3, pays en double, tableaux de 9, erreurs entières positives) ; un
  jeton illisible ne coûte que le jeton. Pas de plafond (~50 Ko par an).
- **Erreurs par case** : `GameState.failed`, tenu par le reducer (`guessFailure`
  reçoit la case), avec `somme(failed) == failedAttemptCount(lives)`. Les vies
  restent lues dans `LivesState`. `game-v3` persiste le détail ; une sauvegarde
  d'avant #154 (ou un détail qui contredit les vies) se recharge en étalant le
  total une à une sur les cases non remplies, dans l'ordre des cases
  ([`failedByCell.ts`](../src/features/game/logic/failedByCell.ts)) : le total
  est exact, seule sa répartition est reconstruite, et sans case « record »
  artificielle. Cela ne touche que la partie en cours le jour du déploiement.
- **Note de difficulté** : gardée dans le journal par le lot 0, retirée avec le
  lot 1 ; une note encore présente dans une entrée est simplement oubliée à la
  lecture.
- **Le cache des répartitions finales** viendra avec « Mes stats » (lot 2).

## Lot 1 — Convex en Europe, une ligne par partie, « Toi et les autres » (#70)

En prod depuis la bascule de la nuit du 4 au 5 novembre 2026 (prod Convex en
`eu-west-1`). Placement tranché le 2026-11-03 sur maquettes dans la vraie app.

### Migration et refonte, en une seule bascule

- Nouveau déploiement Convex en Europe (`eu-west-1`), export puis import des
  données, bascule de nuit (déroulé plus bas). Nouveau schéma et nouveau frontend
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

### « Toi et les autres aujourd'hui » : dans la modale de résultat

- **Lu à la demande.** Le serveur recalcule les scores des parties finies du jour
  et renvoie un histogramme de 101 seaux de 10 points et le taux d'erreur par case
  (part des joueurs qui se sont trompés au moins une fois sur la case). Le client
  se place lui-même. Le nombre de joueurs n'est **jamais affiché**.
- **Seule la zone de la grille d'emojis glisse**, à l'horizontale : page 1 les
  emojis, page 2 l'histogramme du jour, page 3 réservée aux ligues (lot 3). Le
  titre, l'anneau du score, « Voir les réponses » et « Partager » ne bougent pas. Navigation par
  points discrets sous la zone, sans texte d'aide.
- **Pilule « Mieux que X % des joueurs › »** en haut de la page 1, au-dessus des
  emojis, pour tout le monde, sans règle particulière sous la médiane. Un tap fait
  glisser vers le graphique.
- **Graphique** : barres de 50 points (le client regroupe les seaux), la tienne en
  violet avec « Toi », la médiane en pointillé gris avec le repère « médiane » sur
  l'axe (0 · médiane · 1000). Aucun autre texte.
- **Cohorte mince** : sous 5 parties finies (même chiffre que
  `ESTIMATED_MAX_TOTAL`), la pilule dit « Parmi les premiers à finir » et le
  graphique est grisé, « Trop tôt pour comparer ».
- La phrase « Peu de joueurs pour l'instant, ce score s'affinera… » disparaît dans
  tous les cas : le « ≈ » reste dans la légende sous l'anneau, et la fenêtre Info
  l'explique.
- **La chaîne partagée ne change pas.**
- **Pas d'histogramme en entraînement** : un score sur 900 avec essais illimités
  ne se compare pas aux scores du jour.

### Grille solution : 4 calques

- Le **coin vide en haut à gauche** devient le sélecteur : fond violet clair,
  icône calques, nom du calque, points de position. Un tap passe au calque
  suivant, en boucle, sans menu.
- Dans l'ordre :
  - **Réponses** : la grille actuelle ;
  - **Erreurs** : le taux d'erreur par case en teinte rouge, et tes propres
    erreurs en croix, une par erreur, sans texte. Sous 5 parties finies, les
    croix seules, sans les taux ;
  - **Meilleure grille** (« Meilleur score » sur les maquettes) : le combo le plus rare possible, un pays par case, sans
    doublon, calculé côté client depuis la répartition ;
  - **Ma grille** (« Tes choix » sur les maquettes) : ton pays et sa part ;
    tiret pour une case vide, croix pour une case bloquée.
- **Tiroir d'une case** : « X % des joueurs se sont trompés ici ». La
  ligne « Le plus choisi » est retirée.
- **Aussi en entraînement**, sur la cohorte figée du jour rejoué : le serveur
  donne les taux d'erreur des 7 derniers jours, dans la même fenêtre que
  `getReplayGrid`. Les croix sont tes essais ratés de l'entraînement.

### Déroulé de la bascule

1. **Répétition complète sur develop** : le code arrive sur develop en même temps
   que develop passe sur un déploiement européen, avec le même script qu'en prod
   (export, transformation, import), puis e2e et une vraie partie.
2. **En prod, le mainteneur lance les commandes** à partir d'un runbook pas à pas
   (chaque commande suivie de sa vérification). L'export des stats admin, hors du
   repo, vient avant.
3. **Juste après minuit UTC** : la grille de la veille est close, celle du jour
   presque vide. Un joueur en pleine partie continue en local ; ses coups d'après
   la bascule ne comptent pas.
4. **L'ancien déploiement américain est mis en pause aussitôt** (un onglet resté
   ouvert voit « serveur indisponible »), gardé 7 jours comme retour arrière
   possible, en perdant les parties jouées entre-temps, puis supprimé.

### Choix techniques (livrés)

- **Plus de note de difficulté** (décidé le 2026-11-04 après la répétition) :
  il y a assez de joueurs pour lire la difficulté dans le taux de victoire et
  les erreurs par case. La modale propose directement « Voir les réponses » ;
  la note disparaît de la partie, du journal, de la ligne serveur et de
  l'admin (`getGridFeedbackStats` devient `getDailyGameStats`).

- **Jeton tiré par le navigateur** (UUID v4) au premier coup, plutôt que
  renvoyé par le serveur : le premier coup est idempotent comme les autres, et
  la saisie n'attend jamais le réseau. Le serveur n'en garde que le hash
  SHA-256 ; le journal local le garde (`token`) pour le lot 2.
- **`playMove`** rend `applied` (avec `count`/`total` pour un pays posé),
  `duplicate` (rang déjà appliqué, rien n'est écrit) ou `rejected`
  (`date_mismatch`, `unknown_game`, `out_of_order`, `game_over`,
  `cell_unavailable`, `rate_limited`). Le serveur rejoue le coup avec la règle
  du client (`applyMove`, [`gameRecord.ts`](../src/features/game/logic/gameRecord.ts)).
  Un refus arrête l'envoi : la partie continue en local seulement. La file
  d'envoi (`geodoku:move-sync-v1`) survit au rechargement ; une partie
  commencée sans elle reste locale.
- **Rate limit** : un refus rend `rate_limited` au lieu de lever, pour que le
  compteur de surveillance de la même transaction survive. La purge du
  composant retire chaque nuit les lignes créées il y a plus de deux jours.
- **Cohorte** : `getTodayCohort` lit au plus 8 000 parties ; au-delà, le levier
  est l'instantané périodique (Notes). « Mieux que X % » compte les seaux
  inférieurs et la moitié du sien.
- **Meilleure grille** : affectation hongroise sur la fraction de rareté du
  barème (à points égaux, le plus rare), [`bestCombo.ts`](../src/features/game/logic/bestCombo.ts).
- **Entraînement** : `games.getReplayStats` remplace la lecture de la
  répartition figée ; la partie d'entraînement persiste désormais ses erreurs
  par case (les croix).
- **Bascule** : même projet Convex, nouveaux déploiements en `eu-west-1` (la
  région se choisit par déploiement) ; seule la clé de production Vercel
  change. Script `pnpm migrate:eu`, runbook [`bascule-europe.md`](bascule-europe.md).

### Notes

- Convex ne renvoie pas au client le résultat d'une query recalculée s'il n'a pas
  changé (empreinte comparée côté serveur, `crates/sync/src/state.rs` de
  `convex-backend`) : une invalidation coûte un recalcul, pas de bande passante.
- Plus tard, si le trafic grossit nettement : un instantané de la cohorte,
  recalculé toutes les 5 minutes.

## Lot 2 — Compte facultatif (#155)

### Connexion

- **Better Auth** via `@convex-dev/better-auth` (`ConvexProviderWithAuth` à la
  racine), réglages par défaut.
- **Code par e-mail et Google** au lancement. Apple plus tard (abonnement
  développeur annuel, secret à renouveler tous les 6 mois).
- **Aucune donnée de profil Google reprise** : le `name` de Better Auth reçoit le
  pseudo, la photo n'est pas gardée.
- **Budget bundle** : on accepte de relever celui de `check:bundle`.
- **Envoi des codes par MailerSend** (tranché le 2026-11-05) : données hébergées
  en Europe (Google Cloud, Belgique), société américaine (MailerSend, Inc.),
  comme Convex. Gratuit jusqu'à 500 e-mails par mois, largement au-dessus du
  besoin. Better Auth n'appelle qu'une fonction d'envoi (`sendVerificationOTP`) :
  changer de service ne touche qu'elle. Écartés : Resend (données et journaux
  aux États-Unis), Scaleway (français, mais moins éprouvé), Brevo (« la plupart »
  des serveurs en Europe, sans dire lesquels). Enregistrements DNS (SPF, DKIM) à
  poser sur `geodoku.app`, arrivée en boîte de réception à tester sur Gmail,
  Outlook et iCloud avant le lancement.

### Données du compte

- L'e-mail, les parties (lignes du lot 1) et `profiles { userId, pseudo, country? }`.
  Aucun score stocké.
- **Pseudo** généré par un petit générateur amusant, puis **modifiable en texte
  libre** (3 à 20 caractères), avec un dé pour en tirer un autre (tranché le
  2026-11-05, « pour l'instant ») : dans une ligue entre amis, se reconnaître
  (« Camille ») compte plus que le risque, limité aux invités. Un filtre de mots
  interdits à l'enregistrement ; le lot 3 dira s'il faut plus. **Pas d'unicité
  sur tout le site** (le premier « Julie » en priverait les autres) : deux
  pseudos identiques dans une même ligue se distingueront au lot 3.
- **Pays** facultatif, « Mon pays (facultatif) », affiché en drapeau.
- **Suppression** en libre-service, **export** sur demande, **effacement** après
  3 ans sans partie (date de la dernière partie, pas de champ dédié).
- **Supprimer un compte détache ses parties** (tranché le 2026-11-05) : l'e-mail,
  le profil et les sessions sont effacés ; le propriétaire de chaque ligne de
  partie est remplacé par une empreinte tirée au hasard, que personne ne détient.
  Les lignes deviennent celles d'un anonyme qui a perdu son jeton, des données
  anonymes hors du champ du RGPD, et les chiffres passés (« Toi et les autres »,
  taux d'erreur, admin) restent stables. Même geste pour l'effacement après 3 ans.
  Le journal de l'appareil reste au joueur. `/privacy` : « tes parties restent,
  anonymes, dans les statistiques du jeu ».

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

### « Mes stats » et le compte : une seule page

Tranché le 2026-11-05 sur maquettes dans la vraie app, comme au lot 1.

- **« Mes stats » et le compte arrivent dans la même livraison.**
- **Une page à part, avec son adresse**, et « ← Retour à la grille » en haut. Ni
  tiroir ni modale : le contenu est long, le compte y vit (une confirmation de
  suppression ferait une fenêtre sur une fenêtre), et une page a son adresse et
  le bouton retour du téléphone.
- **Entrée : une icône graphique** (Lucide `ChartColumnBig`) à droite des cœurs,
  la même pour tous, connecté ou non. Une silhouette ferait croire qu'il faut se
  connecter pour jouer. Une icône choisie par le joueur (personnalisation, voire
  succès) pourra venir avec les ligues, sans réintroduire de série.
- **Sans compte, la même page**, calculée sur le journal local, avec le
  sous-titre « Sur cet appareil ». **Connecté**, le titre devient le drapeau et le
  pseudo (un crayon pour le modifier), avec « Mes stats · tous mes appareils ».

#### Contenu, de haut en bas

1. **4 cases** : parties jouées, part de grilles complètes, score moyen, record
   (avec sa date). Le même écran dès la première partie.
2. **« Ma palette »** : la part de chaque tier de rareté (🟪 🟦 🟨 🟥) parmi tous
   les pays placés, en pourcentages.
3. **« Mes 30 derniers jours › »** : une barre par jour (hauteur = score), la
   moyenne en pointillé, un point pour un jour non joué, le meilleur score des
   30 jours en violet.
4. **« Mes thématiques › »** : les 3 premières, en « % du premier coup » (case
   remplie sans erreur ; une case compte pour ses deux thématiques). Chaque
   continent compte à part, les autres contraintes sont regroupées par famille.
   Une thématique n'apparaît qu'à partir d'un nombre minimal de cases.
5. Sans compte, l'invitation ; connecté, l'annonce des ligues puis « Mon compte › ».

- **Titres de section à la première personne** (« Mon », « Ma », « Mes ») ; les
  phrases adressées au joueur gardent le tutoiement.
- **Le titre d'une section ouvre son détail** (chevron à droite) : un tiroir sur
  téléphone, une fenêtre centrée sur ordinateur, comme la fenêtre de résultat.
  - **Le jour** (tap sur une barre) : les 30 barres en tête, la date et le numéro
    de grille entre ‹ ›, l'anneau du score et la grille du joueur figée (pays et
    part, tiret pour une case vide, croix pour une case bloquée). On glisse d'un
    jour joué à l'autre ; les jours non joués sont sautés. Pour les 7 derniers
    jours, et seulement une fois la partie du jour finie (sinon l'archive
    redirige), un lien discret « Rejouer cette grille › » ouvre l'entraînement
    de ce jour, ou le reprend.
  - **Toutes les thématiques**, classées.
- **Adresse** : `/fr/stats`, `/en/stats`, hors index (le contenu dépend du
  joueur). **Tiroirs** à geste (vaul) sur téléphone, comme ceux de la grille
  solution et de la saisie ; fenêtre centrée sur ordinateur.
- **Ordinateur** : deux colonnes, les cases et la palette à gauche, les 30 jours
  et les thématiques à droite. Le survol d'une barre affiche « 26 nov. · 815 pts ».
- **Au-delà de 30 jours**, le détail d'un jour n'est plus accessible ; les cases,
  la palette et les thématiques couvrent tout l'historique.

#### États

- **Aucune partie** : une carte « Tes stats commencent avec ta première grille. »,
  puis l'invitation.
- **Seules les parties finies comptent**, comme dans « Toi et les autres ». Une
  partie pas finie, celle du jour comme une partie passée abandonnée en route, ne
  compte nulle part (parties jouées, moyenne, palette, thématiques) ; sa barre est
  un contour en pointillé, et son détail montre la grille telle quelle, sans
  l'anneau du score. Une fois finie, la partie du jour entre partout avec son
  score du moment, qui s'affine jusqu'à minuit comme dans la fenêtre de résultat.
  Un jour sans aucun coup n'existe pas dans le journal : un point dans les barres.
- **Fin d'une partie passée** : plus de vies et 9 cases remplies se lisent dans
  le journal. Une grille bloquée demande les réponses des cases qui en ont 8 ou
  moins (on place au plus 9 pays, une case plus large ne se bloque jamais) :
  quelques dizaines d'octets par jour, renvoyés avec la répartition finale. Les
  mêmes données donnent les croix des cases bloquées dans le détail d'un jour.

#### Invitation et compte

- **Sans compte, l'invitation à deux endroits** : un lien « Créer un compte › »
  sous le titre, visible sans défiler, et une carte en bas, « Crée un compte pour
  les retrouver sur tous tes appareils ».
- **Connecté** : la carte « Bientôt · Les ligues entre amis », sans bouton ni
  mesure du clic, puis la ligne « Mon compte › » avec l'e-mail. Elle ouvre un
  tiroir (une fenêtre sur ordinateur) : le pays, l'e-mail, « Se déconnecter » et
  « Supprimer mon compte ». La suppression reste ainsi loin du pouce qui défile.

#### Données

- Parties jouées et part de grilles complètes : le journal seul (ou les lignes
  du compte), sans réseau.
- Score, record, barres et palette : la **répartition finale** de chaque jour
  joué, environ 1 à 3 Ko par jour. La grille d'un jour et les thématiques
  demandent en plus ses 6 contraintes, environ 150 octets.
- **Une query publique sans identité par jour fini**, pour tous les jours passés :
  `getReplayGrid` ne couvre que J-1 à J-7, et `getReplayStats` relit toutes les
  parties du jour. Un jour fini ne change plus, donc le cache Convex est partagé
  entre joueurs et le navigateur peut le garder.
- **Pas de rang d'un jour passé** (« mieux que X % ce jour-là ») : pas de rang
  permanent, et ce serait le seul élément coûteux.

### À trancher avant de coder

- Liste des thématiques et leur seuil, à vérifier sur de vraies données.
- Écrans sur maquettes : connexion (code par e-mail et Google), e-mail du code,
  vocabulaire du générateur de pseudo et son édition, choix du pays, suppression.

### Docs

- `/privacy` à réécrire : e-mail, MailerSend, durée de conservation, droits. Dire que Better
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
- **Place** : la 3ᵉ page de la zone qui glisse dans la modale de résultat
  (classement du jour de la ligue), réservée au lot 1.

### À trancher avant de coder

- Invitations : lien ou code ? Taille maximale d'une ligue, nombre de ligues par joueur ?
- Semaine : début le lundi à 0 h UTC ? Que faire des jours non joués ?
- Score du jour : il évolue tant que la cohorte se remplit. Que montre le
  classement du jour avant qu'il soit figé (marqueur « ≈ ») ?
- Égalités, départ d'une ligue, retrait d'un membre.
- Pseudos visibles par les autres : faut-il de la modération ?
