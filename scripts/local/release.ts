/**
 * Outil de release SemVer pour Geodoku (utilisable en local ou par un agent).
 *
 * Usage :
 *   pnpm release                 # liste les commits pas encore en prod (origin/main..HEAD)
 *   pnpm release patch|minor|major
 *   pnpm release 3.2.0           # version explicite
 *
 * Règles :
 * - Met à jour `package.json#version`.
 * - Les correctifs (patch) ne demandent aucune entrée dans `/changelog`.
 * - Les mineures et majeures exigent une entrée en tête de `CHANGELOG_ENTRIES`
 *   (`src/features/legal/logic/changelog.ts`) et ses clés FR/EN — gardé par `pnpm test`.
 * - Au merge `develop → main`, `.github/workflows/release-tag.yml` pose
 *   automatiquement le tag `vX.Y.Z` et la GitHub Release.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../..");
const PACKAGE_JSON_PATH = join(ROOT, "package.json");
const CHANGELOG_PATH = join(ROOT, "src/features/legal/logic/changelog.ts");
const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function parseSemver(version: string): [number, number, number] {
  const match = SEMVER_RE.exec(version);
  if (!match) throw new Error(`Version SemVer invalide : ${version}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function bumpVersion(current: string, arg: string): string {
  if (SEMVER_RE.test(arg)) return arg;
  const [major, minor, patch] = parseSemver(current);
  if (arg === "major") return `${major + 1}.0.0`;
  if (arg === "minor") return `${major}.${minor + 1}.0`;
  if (arg === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(
    `Argument inconnu "${arg}". Attendu : patch | minor | major | X.Y.Z`,
  );
}

function git(args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

// Ce qui n'est pas encore en prod = ce que `develop` a de plus que `main`. Pas de
// `git describe` : les tags sont posés sur les commits de merge de `main`, que
// `develop` ne contient pas, et il remonterait un vieux tag après une fusion
// `main → develop`.
function findLastReleaseRef(): string {
  git(["fetch", "origin", "main", "--quiet"]);
  return git(["rev-parse", "--verify", "origin/main"]) ? "origin/main" : "main";
}

function main() {
  const rawPackage = readFileSync(PACKAGE_JSON_PATH, "utf8");
  const pkg = JSON.parse(rawPackage) as { version: string };
  const current = pkg.version;
  const arg = process.argv[2];

  const baseRef = findLastReleaseRef();
  const log = git(["log", `${baseRef}..HEAD`, "--oneline"]);
  const commits = log ? log.split("\n") : [];

  if (!arg || arg === "--check" || arg === "--dry-run") {
    console.log(`Version actuelle (package.json) : ${current}`);
    console.log(`Base de comparaison             : ${baseRef}`);
    console.log(`Commits depuis ${baseRef} (${commits.length}) :`);
    if (commits.length === 0) {
      console.log("  (aucun commit)");
    } else {
      commits.slice(0, 20).forEach((line) => {
        console.log(`  ${line}`);
      });
      if (commits.length > 20) {
        console.log(`  … et ${commits.length - 20} autres`);
      }
    }
    console.log(
      `\npatch (→ ${bumpVersion(current, "patch")}) : correctifs, rien de nouveau pour le joueur.`,
    );
    console.log(
      `minor (→ ${bumpVersion(current, "minor")}) : nouveauté visible du joueur, entrée /changelog.`,
    );
    console.log(
      `major (→ ${bumpVersion(current, "major")}) : sur décision de Thomas, entrée /changelog + spotlight.`,
    );
    console.log(
      "Texte joueur (minor/major) : le montrer à Thomas et attendre son go avant de commiter.",
    );
    return;
  }

  const next = bumpVersion(current, arg);
  if (next === current) {
    console.log(`package.json est déjà en ${current}.`);
    return;
  }

  const updatedPackage = rawPackage.replace(
    `"version": "${current}"`,
    `"version": "${next}"`,
  );
  writeFileSync(PACKAGE_JSON_PATH, updatedPackage, "utf8");
  console.log(`✓ package.json : ${current} → ${next}`);

  const [, , nextPatch] = parseSemver(next);
  if (nextPatch > 0) {
    console.log(
      "✓ Correctif (patch) : aucune entrée /changelog requise. Prêt pour /cleanup puis /commit.",
    );
    return;
  }

  const changelogSource = readFileSync(CHANGELOG_PATH, "utf8");
  if (changelogSource.includes(`version: "${next}"`)) {
    console.log(`✓ Entrée ${next} déjà présente dans changelog.ts.`);
  } else {
    const kind = next.endsWith(".0.0") ? "major" : "minor";
    console.log(
      `\n→ Prochaine étape (${kind}) : ajouter l'entrée ${next} en tête de CHANGELOG_ENTRIES :`,
    );
    console.log(
      "  1. src/features/legal/logic/changelog.ts (dateYmd = jour du merge en prod)",
    );
    console.log(
      "  2. src/i18n/locales/fr.ts et en.ts : title/body, plus milestone et spotlight si major",
    );
    console.log("  3. Montrer les textes FR/EN à Thomas et attendre son go");
    console.log("  4. Lancer `pnpm test`");
  }
}

main();
