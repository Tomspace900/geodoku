import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { gzipSync } from "node:zlib";

const ASSETS_DIRECTORY = "dist/assets";
const MODULE_MANIFEST = "dist/.bundle-modules.json";
// Baseline 2026-07-15 : jeu, résultat et pages éditoriales eager ; admin lazy.
// Depuis le 2026-08-09, l'archive et l'entraînement sont lazy eux aussi (cf.
// `LAZY_ROUTE_MODULES`). React Router rend les navigations publiques
// instantanées, au prix assumé d'un entry plus gros. Les chunks non initiaux
// gardent leur budget anti-monolithe.
const MAX_NON_INITIAL_CHUNK_GZIP_BYTES = 150 * 1024;
// Relevé de 250 à 280 KiB le 2026-08-11. posthog-js pèse à lui seul ~12 KiB de
// plus entre 1.386 et 1.415, et il est `init()` de façon synchrone avant le
// premier render : il est dans le chemin critique tant qu'on ne le charge pas en
// différé. 280 laisse ~24 KiB de marge au-dessus de l'état actuel — assez pour
// absorber les bumps d'analytics, assez serré pour rattraper une vraie dérive.
// Le garde-fou reste **bloquant** : un budget qui warn ne se lit jamais.
const MAX_PLAYER_INITIAL_GZIP_BYTES = 280 * 1024;

const chunks = readdirSync(ASSETS_DIRECTORY)
  .filter((file) => file.endsWith(".js"))
  .map((file) => {
    const path = join(ASSETS_DIRECTORY, file);
    return {
      path,
      gzipBytes: gzipSync(readFileSync(path)).byteLength,
    };
  })
  .sort((a, b) => b.gzipBytes - a.gzipBytes);

if (chunks.length === 0) {
  throw new Error(`Aucun chunk JavaScript trouvé dans ${ASSETS_DIRECTORY}`);
}

console.log("Chunks JavaScript (gzip) :");
chunks.forEach(({ path, gzipBytes }) => {
  console.log(`  ${basename(path)} : ${(gzipBytes / 1024).toFixed(1)} KiB`);
});

type ModuleChunk = {
  fileName: string;
  isEntry: boolean;
  isDynamicEntry: boolean;
  imports: string[];
  modules: string[];
};

const moduleChunks = JSON.parse(
  readFileSync(MODULE_MANIFEST, "utf8"),
) as ModuleChunk[];
const gzipByFileName = new Map(
  chunks.map(({ path, gzipBytes }) => [`assets/${basename(path)}`, gzipBytes]),
);
const byFileName = new Map(
  moduleChunks.map((chunk) => [chunk.fileName, chunk]),
);
const playerEntry = moduleChunks.find((chunk) => chunk.isEntry);
if (!playerEntry) throw new Error("Chunk joueur initial introuvable");

function collectStaticGraph(entryFileName: string): Set<string> {
  const files = new Set<string>();
  function collect(fileName: string): void {
    if (files.has(fileName)) return;
    files.add(fileName);
    byFileName.get(fileName)?.imports.forEach(collect);
  }
  collect(entryFileName);
  return files;
}

const initialFiles = collectStaticGraph(playerEntry.fileName);
const playerInitialGzipBytes = [...initialFiles].reduce(
  (total, fileName) => total + (gzipByFileName.get(fileName) ?? 0),
  0,
);
console.log(
  `Chargement joueur initial : ${(playerInitialGzipBytes / 1024).toFixed(1)} KiB gzip`,
);
if (playerInitialGzipBytes > MAX_PLAYER_INITIAL_GZIP_BYTES) {
  throw new Error(
    `Budget joueur dépassé (${MAX_PLAYER_INITIAL_GZIP_BYTES / 1024} KiB gzip)`,
  );
}

const oversizedNonInitial = chunks.filter(({ path, gzipBytes }) => {
  const fileName = `assets/${basename(path)}`;
  return (
    !initialFiles.has(fileName) && gzipBytes > MAX_NON_INITIAL_CHUNK_GZIP_BYTES
  );
});
if (oversizedNonInitial.length > 0) {
  const names = oversizedNonInitial
    .map(({ path }) => basename(path))
    .join(", ");
  throw new Error(
    `Budget dépassé (${MAX_NON_INITIAL_CHUNK_GZIP_BYTES / 1024} KiB gzip par chunk non initial) : ${names}`,
  );
}

// Routes volontairement chargées en lazy : l'admin (hors parcours joueur), plus
// l'archive et l'entraînement (inatteignables tant que la grille du jour n'est
// pas terminée). Les sortir du chemin critique ne coûte donc rien au quotidien.
// La liste est **exhaustive** dans les deux sens : un `lazy()` retiré comme un
// `lazy()` ajouté par inadvertance fait échouer la vérification.
const LAZY_ROUTE_MODULES = [
  "/src/features/admin/AdminPage.tsx",
  "/src/features/archive/ArchivePage.tsx",
  "/src/features/archive/TrainingPage.tsx",
];

const dynamicEntries = moduleChunks.filter((chunk) => chunk.isDynamicEntry);
const dynamicEntryByModule = new Map(
  LAZY_ROUTE_MODULES.map((moduleSuffix) => [
    moduleSuffix,
    dynamicEntries.find((chunk) =>
      chunk.modules.some((moduleId) => moduleId.endsWith(moduleSuffix)),
    ),
  ]),
);

const missingLazyRoutes = LAZY_ROUTE_MODULES.filter(
  (moduleSuffix) => !dynamicEntryByModule.get(moduleSuffix),
);
if (missingLazyRoutes.length > 0) {
  throw new Error(
    `Ces routes doivent rester en chargement lazy : ${missingLazyRoutes.join(", ")}`,
  );
}
if (dynamicEntries.length !== LAZY_ROUTE_MODULES.length) {
  throw new Error(
    `Entrée dynamique inattendue : le bundle doit en compter exactement ${LAZY_ROUTE_MODULES.length}, trouvé ${dynamicEntries
      .map((chunk) => chunk.fileName)
      .join(", ")}`,
  );
}

const adminEntry = dynamicEntryByModule.get(
  "/src/features/admin/AdminPage.tsx",
);
if (!adminEntry) throw new Error("Chunk admin introuvable");
const adminFiles = collectStaticGraph(adminEntry.fileName);

const eagerModules = [
  "/src/features/game/components/ResultScreen.tsx",
  "/src/features/legal/PrivacyPage.tsx",
  "/src/features/legal/ChangelogPage.tsx",
];
eagerModules.forEach((moduleSuffix) => {
  const owner = moduleChunks.find((chunk) =>
    chunk.modules.some((moduleId) => moduleId.endsWith(moduleSuffix)),
  );
  if (!owner || !initialFiles.has(owner.fileName)) {
    throw new Error(
      `${moduleSuffix} doit rester dans le chargement joueur initial`,
    );
  }
});

const requiredAdminPackages = ["react-day-picker", "date-fns"];
const guardedAdminPackages = [...requiredAdminPackages, "@date-fns/tz"];
const ownersByPackage = new Map(
  guardedAdminPackages.map((packageName) => [
    packageName,
    moduleChunks.filter((chunk) =>
      chunk.modules.some((moduleId) =>
        moduleId.includes(`/node_modules/${packageName}/`),
      ),
    ),
  ]),
);

requiredAdminPackages.forEach((packageName) => {
  if (ownersByPackage.get(packageName)?.length === 0) {
    throw new Error(`${packageName} est introuvable dans le bundle admin`);
  }
});

ownersByPackage.forEach((owners, packageName) => {
  const outsideAdmin = owners.filter(
    (owner) =>
      initialFiles.has(owner.fileName) || !adminFiles.has(owner.fileName),
  );
  if (outsideAdmin.length > 0) {
    throw new Error(
      `${packageName} doit rester exclusivement dans le graphe admin : ${outsideAdmin
        .map((owner) => owner.fileName)
        .join(", ")}`,
    );
  }
});
