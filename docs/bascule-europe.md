# Bascule de Convex vers l'Europe — runbook (#70)

Runbook du lot 1 du chantier « Comptes, stats et ligues » (plan :
[`comptes-stats-ligues.md`](comptes-stats-ligues.md)). Il vit dans `docs/` le
temps de la bascule et sera retiré une fois l'ancien déploiement américain
supprimé (§12 d'`AGENTS.md`). Chaque commande est suivie de sa vérification :
on ne passe à la suivante que si elle est bonne.

## Principe

- **Même projet Convex, nouveaux déploiements** : la région se choisit par
  déploiement (`pnpm exec convex deployment create … --region eu`, soit
  `aws-eu-west-1`, Irlande). Le projet, l'équipe et la clé de déploiement
  *preview* de Vercel ne changent pas ; seule la clé *production* change.
- **Même script pour develop et la prod** : `pnpm migrate:eu`
  ([`scripts/local/migrate-to-eu.ts`](../scripts/local/migrate-to-eu.ts)),
  en trois temps, chacun vérifiable :
  - `export --from <déploiement> --dir <dossier>` : export Convex complet ;
  - `transform --dir <dossier>` : hors-ligne, `guesses` → `cellStats`, retrait
    des champs legacy, `dailyStats` et `gridFeedback` mis de côté dans
    `admin-stats-avant-bascule.json` ; s'arrête si la somme des comptes par
    pays change ;
  - `import --to <déploiement> --dir <dossier>` : `--replace-all`, après avoir
    retapé le nom de la cible.
- **Le dossier est hors du repo** (le script refuse sinon) : il contient des
  données de joueurs. `~/geodoku-bascule/` dans tout ce document.
- **Ordre** : données d'abord, code ensuite. Un déploiement vierge accepte
  l'import sans schéma ; le code poussé ensuite valide son schéma sur des
  données déjà au bon format. Aucun code de compatibilité avec l'ancien backend.
- Aucun secret dans une commande : `pnpm exec convex env set NOM --deployment X`
  sans valeur demande la valeur au clavier.

Notation : `US_DEVELOP` = `wonderful-viper-134`, `US_PROD` =
`kindly-elephant-663`. `EU_DEVELOP` et `EU_PROD` sont les noms donnés par
Convex à la création (`mot-mot-123`).

## 1. Répétition sur develop

Pré-requis : le lot est prêt sur une branche locale, **non poussé**. Rien qui
change le schéma ne part sur `develop` avant l'étape 1.7.

1. **Exporter develop.**
   ```bash
   pnpm migrate:eu export --from wonderful-viper-134 --dir ~/geodoku-bascule/develop
   ```
   Vérifier : `~/geodoku-bascule/develop/source.zip` existe.

2. **Transformer.**
   ```bash
   pnpm migrate:eu transform --dir ~/geodoku-bascule/develop
   ```
   Vérifier dans le rapport affiché : `guessCountBefore` = `guessCountAfter`,
   `skippedGuesses` à 0 (sinon lire pourquoi), `grids` et `gridCandidates`
   égaux à ceux du dashboard de develop.

3. **Supprimer l'ancien develop américain** (dashboard Convex → déploiement
   `wonderful-viper-134` → Settings → Delete). Le site develop est en panne
   jusqu'à l'étape 1.7 : c'est attendu. L'export de l'étape 1.1 reste le
   retour arrière.

4. **Créer develop en Europe, sans expiration.**
   ```bash
   pnpm exec convex deployment create develop --type preview --region eu --expiration none
   ```
   Vérifier : l'URL affichée finit par `.eu-west-1.convex.cloud`, et le
   dashboard montre « never expires ». Noter le nom (`EU_DEVELOP`).
   Vérifier aussi que `pnpm exec convex env list --deployment preview/develop`
   répond : c'est le nom que Vercel cherchera pour la branche `develop`. Passer
   `preview/develop` à la création donne `preview/preview-develop`, que Vercel
   ne trouverait pas.
   Si la CLI refuse la référence `develop` : régler la région par
   défaut de l'équipe sur l'Europe (Team settings → General), faire l'étape 1.7
   (le push) avant 1.5 et 1.6. Vercel recrée alors `develop` en Europe et le
   remplit avec `seed:autoSeedIfEmpty`, que l'import remplace ; relancer
   ensuite les e2e.

5. **Variables d'environnement.**
   ```bash
   pnpm exec convex env set ADMIN_TOKEN --deployment EU_DEVELOP
   ```
   (même valeur qu'avant sur develop). Pas de `POSTHOG_PROJECT_TOKEN` sur
   develop : les previews n'envoient rien à PostHog.
   Vérifier : `pnpm exec convex env list --deployment EU_DEVELOP` liste `ADMIN_TOKEN`.

6. **Importer.**
   ```bash
   pnpm migrate:eu import --to EU_DEVELOP --dir ~/geodoku-bascule/develop
   ```
   Vérifier : `pnpm exec convex data --deployment EU_DEVELOP` liste `cellStats`,
   `grids`, `gridAnswers`, `gridCandidates`, `poolState`, et rien d'autre.

7. **Adresse des e2e, puis code.**
   ```bash
   gh variable set VITE_CONVEX_URL --body https://EU_DEVELOP.eu-west-1.convex.cloud
   ```
   Puis pousser `develop` (commits signés). Vercel pousse fonctions et schéma
   sur `EU_DEVELOP` ; la CI lance les e2e.
   Vérifier : le déploiement Vercel de `develop` est « Ready » ;
   `pnpm exec convex function-spec --deployment EU_DEVELOP` contient
   `games:playMove`. Si les e2e sont partis avant la fin du déploiement Vercel,
   les relancer (`gh run rerun <id>`).

8. **Jouer une vraie partie** sur le site develop, la finir, noter la grille,
   faire glisser vers le graphique, passer les 4 calques.
   Vérifier : `pnpm exec convex data games --deployment EU_DEVELOP --limit 1` montre
   la partie, avec la note ; l'admin (`/admin`) affiche la journée.

## 2. Prod : la veille

1. **PR `develop` → `main`** ouverte, CI verte, **non mergée**.

2. **Date du changelog** : mettre `othersDate` (fr/en) et
   `LATEST_CHANGELOG_UPDATE_DATE` ([`changelog.ts`](../src/features/legal/logic/changelog.ts))
   au jour de la bascule, commit sur `develop`.

3. **Stats admin et répétition de la transformation sur les vraies données.**
   ```bash
   pnpm migrate:eu export --from kindly-elephant-663 --dir ~/geodoku-bascule/prod-veille
   pnpm migrate:eu transform --dir ~/geodoku-bascule/prod-veille
   ```
   Vérifier : rapport sans perte (comme en 1.2). Garder
   `admin-stats-avant-bascule.json` : c'est l'export des stats admin (victoires,
   causes de défaite, notes, erreurs par case) hors du repo. La nuit, l'export
   final le complétera du dernier jour.

4. **Créer la prod européenne, par défaut.**
   ```bash
   pnpm exec convex deployment create prod-eu --type prod --region eu --default
   ```
   Vérifier : URL en `.eu-west-1.convex.cloud`. Noter le nom (`EU_PROD`).
   Désormais `--prod` et `pnpm dump:prod` visent l'Europe (vide jusqu'à la
   nuit) : ne pas lancer `dump:prod` d'ici là.

5. **Variables d'environnement de `EU_PROD`.**
   ```bash
   pnpm exec convex env get ADMIN_TOKEN --deployment kindly-elephant-663
   pnpm exec convex env set ADMIN_TOKEN --deployment EU_PROD
   pnpm exec convex env set POSTHOG_PROJECT_TOKEN --deployment EU_PROD
   pnpm exec convex env set POSTHOG_HOST --deployment EU_PROD
   ```
   `POSTHOG_PROJECT_TOKEN` = la valeur de `VITE_POSTHOG_PROJECT_TOKEN` de la
   prod Vercel (jeton public du projet) ; `POSTHOG_HOST` = l'hôte d'ingestion
   du projet (`https://eu.i.posthog.com` pour un projet PostHog EU).
   Vérifier : `pnpm exec convex env list --deployment EU_PROD` liste les trois.

6. **Clé de déploiement** : dashboard → `EU_PROD` → Settings → Deploy keys →
   générer, la ranger dans le gestionnaire de mots de passe. Ne pas encore la
   mettre dans Vercel.

7. **Répéter l'import** sur `EU_PROD` avec les données de la veille.
   ```bash
   pnpm migrate:eu import --to EU_PROD --dir ~/geodoku-bascule/prod-veille
   ```
   Vérifier : `pnpm exec convex data --deployment EU_PROD` (mêmes tables qu'en 1.6).
   La nuit, `--replace-all` remplacera tout.

## 3. Prod : la nuit, juste après minuit UTC

La grille de la veille est close, celle du jour presque vide. Un joueur en
pleine partie continue en local ; ses coups d'après la bascule ne comptent pas.

1. **Grille du jour présente côté US** (le cron horaire l'a créée la veille).
   ```bash
   pnpm exec convex run grids:getTodayGrid --deployment kindly-elephant-663
   ```
   Vérifier : `date` = le jour qui commence. Sinon attendre le cron ou
   `runEnsureTomorrow` dans `/admin`.

2. **Exporter et transformer.**
   ```bash
   pnpm migrate:eu export --from kindly-elephant-663 --dir ~/geodoku-bascule/prod
   pnpm migrate:eu transform --dir ~/geodoku-bascule/prod
   ```
   Vérifier : rapport sans perte, `grids` = veille + 1 ou 2.

3. **Importer.**
   ```bash
   pnpm migrate:eu import --to EU_PROD --dir ~/geodoku-bascule/prod
   ```
   Vérifier : `pnpm exec convex data grids --deployment EU_PROD --limit 3` montre la
   grille du jour et celle de demain.

4. **Clé de production Vercel** : Project → Settings → Environment Variables →
   `CONVEX_DEPLOY_KEY` (Production) = la clé de l'étape 2.6.

5. **Merger la PR `develop` → `main`.** Vercel construit `main` et pousse
   fonctions et schéma sur `EU_PROD`.
   Vérifier : déploiement Vercel « Ready » ;
   `pnpm exec convex function-spec --deployment EU_PROD` contient `games:playMove` ;
   geodoku.app charge la grille du jour (réseau : requêtes vers
   `EU_PROD.eu-west-1.convex.cloud`).

6. **Mettre l'ancienne prod en pause** : dashboard → `kindly-elephant-663` →
   Settings → Pause deployment.
   Vérifier : un onglet resté ouvert sur l'ancien bundle affiche « serveur
   indisponible » ; les crons américains sont sautés.

7. **Jouer une vraie partie** sur geodoku.app.
   Vérifier : `pnpm exec convex data games --deployment EU_PROD --limit 1` ;
   `/admin` affiche le jour. Le lendemain : `server_health_hourly` arrive dans
   PostHog chaque heure ; y régler les alertes.

8. **Suivi** : fermer #70 puis la passer en « En prod » (§12 : fermer,
   attendre, poser le statut, relire), et ce qui est « Sur develop ».

## 4. Retour arrière (7 jours)

Les parties jouées en Europe entre-temps sont perdues.

1. Dashboard → `kindly-elephant-663` → Resume deployment.
2. Vercel → Deployments → dernier déploiement de production d'avant la
   bascule → Instant Rollback. Son bundle vise l'adresse américaine.
3. `CONVEX_DEPLOY_KEY` (Production) = l'ancienne clé US, sinon le prochain
   build de `main` repartirait vers l'Europe.
4. Revenir sur `develop` par un `git revert` du lot, poussé puis passé en PR
   vers `main` comme d'habitude.

## 5. Après 7 jours

1. Supprimer `kindly-elephant-663` (dashboard).
2. Supprimer `~/geodoku-bascule/` sauf `admin-stats-avant-bascule.json` de la
   nuit, gardé hors du repo.
3. Retirer ce runbook et `pnpm migrate:eu` (script, module, test) : l'historique
   git les garde.
