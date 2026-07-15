/**
 * Ping Convex avant la suite e2e : VITE_CONVEX_URL définie, format valide,
 * déploiement joignable et grille du jour présente.
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const CONVEX_URL_RE = /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.convex\.cloud\/?$/;

function fail(message: string): never {
  console.error(message);
  console.error(
    "Si l'URL a changé (preview develop recréé) : pnpm sync:e2e-convex-url",
  );
  process.exit(1);
}

const raw = process.env.VITE_CONVEX_URL?.trim();
if (!raw) {
  fail(
    "VITE_CONVEX_URL manquante — définir dans .env.local (local) ou vars GitHub Actions (CI).",
  );
}

if (!CONVEX_URL_RE.test(raw)) {
  fail(`VITE_CONVEX_URL invalide : ${raw}`);
}

const url = raw.replace(/\/$/, "");

try {
  const grid = await new ConvexHttpClient(url).query(api.grids.getTodayGrid);
  console.log(`✓ Convex joignable : ${url}`);
  if (grid === null) {
    fail(
      "Pas de grille pour aujourd'hui sur ce déploiement — les e2e ne peuvent pas démarrer.",
    );
  }
  console.log(`  Grille du jour : ${grid.date}`);
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  fail(
    `Convex injoignable (${url}) : ${detail || "erreur réseau ou déploiement inexistant"}`,
  );
}
