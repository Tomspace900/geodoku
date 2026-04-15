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

`convex/_generated/` is tracked in git so `pnpm build` works on Vercel without running the Convex CLI there. Regenerate it with `pnpm dlx convex@latest dev` (or `codegen`) after schema changes, then commit the diff.
