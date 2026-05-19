# Geodoku

Daily geographic grid puzzle — find countries matching every row and column constraint.

## Commands

```bash
pnpm dev      # Start dev server
pnpm build    # Production build
pnpm test     # Run tests
pnpm lint     # Lint with Biome
```

## Setup

Initialize the Convex backend (required before first run):

```bash
pnpm dlx convex@latest dev
```

This will prompt you to create or link a Convex project and write `VITE_CONVEX_URL` to `.env.local`.

`convex/_generated/` is tracked in git so `pnpm build` works locally without a live Convex deployment. Regenerate it with `pnpm dlx convex@latest dev` (or `codegen`) after schema changes, then commit the diff.

## Deployment

Vercel deploys front and backend together via the build command:

```bash
pnpm exec convex deploy --cmd 'pnpm run build' --cmd-url-env-var-name VITE_CONVEX_URL
```

| Git branch | Vercel | Convex backend | Data |
|------------|--------|----------------|------|
| `main` | Production | prod | persistent |
| any other branch | Preview | `preview/<branch>` | empty on first deploy |
| local | — | personal dev cloud (`convex dev`) | persistent |

Preview Convex backends start empty. To seed grids for manual testing on a preview:

```bash
# Seed a preview deployment (after the branch has been pushed once)
pnpm exec convex run seed:seedHistoricalGrids --deployment preview/<branch-name>

# Wipe and reseed
pnpm exec convex run wipe:wipeAllData --deployment preview/<branch-name>
pnpm exec convex run seed:seedHistoricalGrids --deployment preview/<branch-name>
```

### Manual dashboard setup

**Convex** ([dashboard.convex.dev](https://dashboard.convex.dev)) — project settings:

1. Generate **Production Deploy Key** → Vercel env `CONVEX_DEPLOY_KEY` (Production only)
2. Generate **Preview Deploy Key** → Vercel env `CONVEX_DEPLOY_KEY` (Preview only)
3. Preview **Environment Variable Defaults**: `ADMIN_TOKEN`, `ALLOW_UNSCHEDULE_CURRENT_DAY=true`

**Vercel** — project `geodoku`:

1. Build command override (see command above)
2. Remove static `VITE_CONVEX_URL` from all environments (injected at build by `convex deploy`)
3. Add `CONVEX_DEPLOY_KEY` per environment (prod key → Production, preview key → Preview)

**GitHub** — repo settings → Actions secrets:

- Remove `CONVEX_DEPLOY_KEY_DEV` (no GitHub Actions Convex deploy)
