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
