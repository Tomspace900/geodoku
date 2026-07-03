#!/usr/bin/env bash
# Récupère l'URL du déploiement Convex preview/develop et met à jour la
# variable GitHub Actions VITE_CONVEX_URL (utilisée par le job e2e en CI).
# Script local uniquement — jamais exécuté par la CI.
#
# Prérequis : pnpm install, npx convex login, gh auth login
# Usage : pnpm sync:e2e-convex-url
#         SLEEP_SEC=5 pnpm sync:e2e-convex-url   # si réseau lent

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

SLEEP_SEC="${SLEEP_SEC:-3}"

if ! command -v gh >/dev/null; then
  echo "gh CLI requis : https://cli.github.com/" >&2
  exit 1
fi

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

# convex deploy --dry-run affiche l'URL puis attend un prompt interactif.
# On redirige vers un fichier (pas de pipe → pas de buffering bloquant) et on
# coupe le process après quelques secondes, une fois l'URL écrite.
pnpm exec convex deploy --dry-run --preview-name develop >"$tmp" 2>&1 &
pid=$!
sleep "$SLEEP_SEC"
kill "$pid" 2>/dev/null || true
wait "$pid" 2>/dev/null || true

url=$(grep -oE 'https://[a-z0-9.-]+\.convex\.cloud' "$tmp" | head -1)

if [[ -z "$url" ]]; then
  echo "URL Convex develop introuvable." >&2
  echo "Vérifier : convex login, preview/develop existant, ou SLEEP_SEC=5 pnpm sync:e2e-convex-url" >&2
  exit 1
fi

gh variable set VITE_CONVEX_URL --body "$url"
echo "✓ VITE_CONVEX_URL=$url"
