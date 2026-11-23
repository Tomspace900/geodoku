#!/usr/bin/env bash
# Contrôle d'un déploiement Vercel, lancé par .github/workflows/deploy-check.yml
# à chaque déploiement réussi (develop et prod, #178). L'e2e sert `vite preview`,
# sans le middleware Vercel : sans ce contrôle, un middleware cassé passait la
# CI (500 sur toutes les adresses sans langue de develop en #176).
#
# Vise l'adresse propre au déploiement (celle du commit, pas le domaine, qui
# peut encore servir le déploiement précédent), protégée par Vercel : la clé
# « Protection Bypass for Automation » passe en en-tête.
#
#   VERCEL_AUTOMATION_BYPASS_SECRET=… scripts/ci/check-deployment.sh <url>
set -euo pipefail

base="${1:?usage: check-deployment.sh <url du déploiement>}"
base="${base%/}"
secret="${VERCEL_AUTOMATION_BYPASS_SECRET:-}"
# Hôte attendu, surchargeable pour essayer le script contre un serveur local.
host_pattern="${DEPLOYMENT_HOST_PATTERN:-^https://geodoku-[a-z0-9-]+-tomspace900\.vercel\.app$}"

# La clé part vers cette adresse : jamais vers un autre hôte que les nôtres.
if ! [[ "$base" =~ $host_pattern ]]; then
  echo "::error::Adresse de déploiement inattendue : $base"
  exit 1
fi
if [ -z "$secret" ]; then
  echo "::error::Secret VERCEL_AUTOMATION_BYPASS_SECRET absent (Vercel → Settings → Deployment Protection → Protection Bypass for Automation)"
  exit 1
fi

failures=0
fail() {
  echo "::error::$1"
  failures=$((failures + 1))
}

# Une requête, sans suivre les redirections : « <statut> <Location absolue> ».
request() {
  curl -sS -o /dev/null --max-time 20 --retry 2 --retry-delay 3 \
    -H "x-vercel-protection-bypass: $secret" \
    -w '%{http_code} %{redirect_url}' "$@" || echo "000 "
}

# Adresse sans langue → 302 vers la même page dans la langue attendue → 200.
check_redirect() {
  local path="$1" cookie="$2" locale="$3"
  local expected="/$locale"
  [ "$path" != "/" ] && expected="/$locale$path"
  local args=()
  [ -n "$cookie" ] && args=(-H "Cookie: $cookie")
  local label="$path${cookie:+ ($cookie)}"

  local status location target
  read -r status location <<<"$(request "${args[@]}" "$base$path")"
  if [ "$status" != "302" ]; then
    fail "$label : $status au lieu de 302"
    return
  fi
  # Même hôte que le déploiement : la clé ne suit pas une redirection ailleurs.
  if [[ "$location" != "$base/"* ]]; then
    fail "$label : redirige hors du déploiement ($location)"
    return
  fi
  target="/${location#"$base"/}"
  if [ "$target" != "$expected" ]; then
    fail "$label : redirige vers $target au lieu de $expected"
    return
  fi
  read -r status _ <<<"$(request "$location")"
  if [ "$status" != "200" ]; then
    fail "$label → $target : $status au lieu de 200"
    return
  fi
  echo "✓ $label → $target (200)"
}

for path in / /about /archive; do
  check_redirect "$path" "" en
  check_redirect "$path" "geodoku_locale=fr" fr
done

# La CSP (en observation ou bloquante) ne doit pas disparaître d'un déploiement.
headers=$(curl -sS -D - -o /dev/null --max-time 20 --retry 2 --retry-delay 3 \
  -H "x-vercel-protection-bypass: $secret" "$base/en" || true)
if grep -qiE '^content-security-policy(-report-only)?: .*default-src' <<<"$headers"; then
  echo "✓ /en : en-tête CSP présent"
else
  fail "/en : aucun en-tête Content-Security-Policy"
fi

if [ "$failures" -gt 0 ]; then
  echo "$failures contrôle(s) en échec sur $base"
  exit 1
fi
echo "Déploiement sain : $base"
