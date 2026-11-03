/**
 * Bascule vers Convex en Europe (#70) : export de l'ancien déploiement,
 * transformation hors-ligne, import dans le nouveau. Même script pour la
 * répétition sur develop et pour la prod (runbook : docs/bascule-europe.md).
 *
 *   pnpm migrate:eu export    --from <déploiement> --dir <dossier hors repo>
 *   pnpm migrate:eu transform --dir <dossier>
 *   pnpm migrate:eu import    --to <déploiement> --dir <dossier>
 *
 * `<déploiement>` est passé tel quel à `convex … --deployment` : un nom
 * (`joyful-capybara-123`), une référence (`preview/develop`) ou
 * `projet:référence`. Le dossier reçoit des données de joueurs : il doit être
 * hors du repo, jamais committé.
 */
import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import {
  parseJsonl,
  type Tables,
  toJsonl,
  transformExport,
} from "./eu-migration";

const SOURCE_ZIP = "source.zip";
const TARGET_ZIP = "target.zip";
const ADMIN_STATS = "admin-stats-avant-bascule.json";
const REPORT = "rapport-transformation.json";

function run(command: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((done, fail) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false, cwd });
    child.once("error", fail);
    child.once("close", (code) =>
      code === 0
        ? done()
        : fail(new Error(`${command} a échoué (code ${code ?? "inconnu"})`)),
    );
  });
}

function option(argv: string[], name: string): string {
  const index = argv.indexOf(`--${name}`);
  const value = index >= 0 ? argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`Option --${name} manquante`);
  }
  return value;
}

/** Les données de joueurs ne doivent jamais atterrir dans le repo. */
function outsideRepo(dir: string): string {
  const absolute = resolve(dir);
  const fromRepo = relative(process.cwd(), absolute);
  if (!fromRepo.startsWith("..")) {
    throw new Error(
      `Le dossier ${absolute} est dans le repo : choisir un dossier hors du repo.`,
    );
  }
  return absolute;
}

async function readExport(zipPath: string): Promise<Tables> {
  const dir = await mkdtemp(join(tmpdir(), "geodoku-eu-src-"));
  try {
    await run("unzip", ["-q", zipPath, "-d", dir]);
    const tables: Tables = {};
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      // `_tables`, `_components` et `_storage` sont des métadonnées d'export.
      if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
      const text = await readFile(
        join(dir, entry.name, "documents.jsonl"),
        "utf8",
      );
      tables[entry.name] = parseJsonl(text);
    }
    return tables;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function writeImport(tables: Tables, zipPath: string): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "geodoku-eu-dst-"));
  try {
    for (const [table, docs] of Object.entries(tables)) {
      await mkdir(join(dir, table));
      await writeFile(join(dir, table, "documents.jsonl"), toJsonl(docs));
    }
    await rm(zipPath, { force: true });
    await run("zip", ["-q", "-r", zipPath, "."], dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function confirm(target: string): Promise<void> {
  if (!process.stdin.isTTY) {
    throw new Error(
      "L'import exige un terminal interactif et une confirmation.",
    );
  }
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await prompt.question(
      `L'import REMPLACE toutes les données de ${target}. Retaper ce nom pour confirmer : `,
    );
    if (answer.trim() !== target)
      throw new Error("Confirmation incorrecte, import annulé.");
  } finally {
    prompt.close();
  }
}

async function exportStep(argv: string[]): Promise<void> {
  const from = option(argv, "from");
  const dir = outsideRepo(option(argv, "dir"));
  await mkdir(dir, { recursive: true });
  const zip = join(dir, SOURCE_ZIP);
  await rm(zip, { force: true });
  await run("pnpm", [
    "exec",
    "convex",
    "export",
    "--deployment",
    from,
    "--path",
    zip,
  ]);
  console.log(`Export de ${from} : ${zip}`);
}

async function transformStep(argv: string[]): Promise<void> {
  const dir = outsideRepo(option(argv, "dir"));
  const source = await readExport(join(dir, SOURCE_ZIP));
  const { tables, adminStats, report } = transformExport(source);
  if (report.guessCountBefore !== report.guessCountAfter) {
    throw new Error(
      "Les comptes par pays ne se conservent pas : transformation arrêtée.",
    );
  }
  await writeImport(tables, join(dir, TARGET_ZIP));
  await writeFile(
    join(dir, ADMIN_STATS),
    `${JSON.stringify({ exportedAt: new Date().toISOString(), ...adminStats }, null, 2)}\n`,
  );
  await writeFile(join(dir, REPORT), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  console.log(`Import prêt : ${join(dir, TARGET_ZIP)}`);
  console.log(`Stats admin d'avant la bascule : ${join(dir, ADMIN_STATS)}`);
}

async function importStep(argv: string[]): Promise<void> {
  const to = option(argv, "to");
  const dir = outsideRepo(option(argv, "dir"));
  const zip = join(dir, TARGET_ZIP);
  await stat(zip);
  await confirm(to);
  await run("pnpm", [
    "exec",
    "convex",
    "import",
    "--deployment",
    to,
    "--replace-all",
    "-y",
    zip,
  ]);
  console.log(`Import terminé dans ${to}.`);
}

const STEPS: Record<string, (argv: string[]) => Promise<void>> = {
  export: exportStep,
  transform: transformStep,
  import: importStep,
};

async function main(): Promise<void> {
  const [step, ...argv] = process.argv.slice(2);
  const handler = step ? STEPS[step] : undefined;
  if (!handler) {
    throw new Error(
      "Usage : migrate-to-eu.ts export|transform|import [options]",
    );
  }
  await handler(argv);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
