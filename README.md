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

Reset and seed a local or preview backend:

```bash
pnpm wipe:db      # clears all game tables (dev only)
pnpm seed:grids   # pool + J-30..today + tomorrow (fails if grids non-empty)
```

For CI/deployment (Vercel build command, preview auto-seed, environment mapping), see `AGENTS.md §8`.
