# Geodoku

Daily geographic grid puzzle — find countries matching every row and column constraint.

## Commands

```bash
pnpm dev                  # Start dev server
pnpm build                # Typecheck app + production build
pnpm lint                 # Biome + all TypeScript projects
pnpm test                 # Unit tests
pnpm check:design-system  # Enforce Geodoku visual rules
pnpm check:bundle         # Build and enforce the gzip chunk budget
```

## Setup

Initialize the Convex backend (required before first run):

```bash
pnpm convex:dev
```

This will prompt you to create or link a Convex project and write `VITE_CONVEX_URL` to `.env.local`.

`convex/_generated/` is tracked in git so `pnpm build` works without a live Convex deployment. After schema or API changes, regenerate with `pnpm convex:dev` (or `codegen`) and commit the diff.

## Admin

Dashboard at `/admin` — requires the Convex `ADMIN_TOKEN` env var. From there you can:

- Plan tomorrow's grid if the daily cron hasn't run yet
- Regenerate the candidate pool (after tuning generator/scheduler constants)
- Preview upcoming grids and inspect scheduling metrics

See `AGENTS.md §6` for the full admin API and UI panels.

## Dev data

Reset and seed a **personal cloud dev** backend only:

```bash
pnpm exec convex env set ALLOW_DESTRUCTIVE_DEV_COMMANDS true
pnpm wipe:db      # refuses non-dev targets; clears all game tables
pnpm seed:grids   # pool + J-30..today + tomorrow (fails if grids non-empty)
pnpm exec convex env remove ALLOW_DESTRUCTIVE_DEV_COMMANDS
```

`ALLOW_DESTRUCTIVE_DEV_COMMANDS` must stay absent from production and persistent
preview deployments. The server-side wipe also requires a literal confirmation,
so invoking the Convex function directly does not bypass the guard.

To reproduce persistent data locally, use `pnpm dump:prod` or
`pnpm dump:develop`. Both verify that the import target is a personal `dev:*`
deployment and clean their temporary archive even after a failure.
`pnpm dump:prod-to-develop` is an exceptional destructive operation: it requires
an interactive `develop` confirmation before replacing preview/develop.

`pnpm simulate:players` is a dry-run by default. Add `--execute` to submit the
generated games; writes to an unverifiable or production target remain blocked
unless `--force` is supplied explicitly.

The additive write-integrity rollout, rollback-safe persistence window and
explicit first migration of the legacy pool are documented in
[`docs/rollout-write-integrity.md`](docs/rollout-write-integrity.md).

For CI/deployment (Vercel build command, preview auto-seed, environment mapping), see `AGENTS.md §8`.
